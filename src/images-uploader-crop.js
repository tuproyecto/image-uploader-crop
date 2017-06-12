// image-uploader-crop v1.0 for jQuery that uses fine-uploader, jcrop
// ==================================================================
// Dependencies: jQuery, fine-uploader, jcrop
// Author: TuProyecto.co
// Developer: @krobing
// Created: 04/03/2016
// Website: tuproyecto.co
// Description: cropper and uploader of images that uses another libraries

(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node/CommonJS
		module.exports = factory(require('jquery'));
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function ($) {
	var slice = Array.prototype.slice; // save ref to original slice()
	var splice = Array.prototype.splice; // save ref to original slice()

	// default options
	var defaults = {
		formCrop: null,
		imgCrop: null,
		previewImg: null,
		uploaderImg: null,
		templateImgUploader: '',
		configImg: {
			maxWidthImg : 0, // 646 * 2
			maxHeightImg : 0, // 374 * 2
			minWidthImg : 0,
			minHeightImg : 0,
			allowedExtensions: ['jpeg', 'jpg', 'png'],
			sizeLimit: 0, // 50 kB = 50 * 1024 bytes,
			sendOriginal: true, // send images original in true
			defaultQuality: 100 // quality of the image, range( 1 - 100 )
		},
		uploadding: {
			inputName: 'file',
			endpoint: '',
			params: {}
		},
		cropping: {
			endpoint: '',
			params: {}
		},
		extraDropzones: [$('#wrapper-image-crop')],
		// Events handlers
		callbacks: {
			onCropping: function (jcrop_img) {},
			onCropComplete: function (jcrop_img, resp, jqXHR) {},
			onCropError: function (jcrop_img, jqXHR, error) {},
			onLoadImg: function ($uploaderImg, id, name) {},
			onCompleteLoad: function ($uploaderImg, id, name, res) {}
		},
		showMessage: function (message) {
			return alertify.alert(message);
		},
		showConfirm: function (message) {
			var promise = new qq.Promise();
			alertify.confirm(message, function(result) {
				if (result) {
					return promise.success(result);
				} else {
					return promise.failure();
				}
			});
			return promise;
		},
		showPrompt: function (message, defaultValue) {
			var promise = new qq.Promise();

			alertify.prompt(message, function(result, inStr) {
				if (result) {
					return promise.success(inStr);
				} else {
					return promise.failure(inStr);
				}
			}, defaultValue);
			return promise;
		}
	};

	// ==============
	// helpers method
	// ==============
	/**
	*  Serialize form into json format
	*  @param { string } name class or id of the html element to embed the loader
	*  @return { object } form into json
	*/
	function formToJson ( selector ){

		var o = {}, a = [];
		if( $.prototype.isPrototypeOf(selector) ){
			a = selector.serializeArray();
		}
		else{
			a = $(selector).serializeArray();
		}

		$.each( a, function() {
			if ( o[ this.name ] !== undefined ) {
				if ( ! o[this.name].push ) {
					o[ this.name ] = [ o[ this.name ] ];
				}

				o[ this.name ].push( this.value || '' );

			} else {
				o[ this.name ] = this.value || '';
			}
		});

		return o;
	}

	/**
	* Set select on image crop
	* @param Number imgWidth
	* @param Number imgHeight
	*/
	function setSquare (imgWidth, imgHeight) {
		var minDim = Math.min(imgWidth, imgHeight);

		if( imgWidth == imgHeight ){
			return [imgWidth, imgHeight];
		}

		return [minDim, minDim];
	}

	// check out if exits jQuery plugin fineuploader
	function existUploaderPlugin () {

		if( ({}).hasOwnProperty.call($.fn, 'fineUploader') ){
			return true;
		}else {
			return false;
		}
	}

	// check out if exits jQuery plugin jcrop
	function existCropPlugin () {

		if( ({}).hasOwnProperty.call($.fn, 'Jcrop') ){
			return true;
		}else {
			return false;
		}
	}

	/**
	* privates methods
	*/
	var methods = {
		/**
		* reassign events and another things
		*/
		reassignActions: function() {
			this.settings.uploaderImg.off('complete');
			this.settings.uploaderImg.on('complete', methods.onCompleteLoadImg.bind(this));
			this.settings.formCrop.off('submit');
			this.settings.formCrop.on('submit', methods.submitCropImage.bind(this));
		},

		/**
		* destroy plugin
		*/
		destroy: function () {
			// destroy jcrop
			if( this.settings.imgCrop.data('Jcrop') !== undefined ){
				this.jcrop_img.destroy();
			}

			// undelegate events
			// this.settings.uploaderImg.off('upload');
			this.settings.uploaderImg.off('complete');
			this.settings.formCrop.off('submit');

			// remove object plugin in data
			this.$element.removeData('imageUploaderCrop');
		},

		/**
		* set image
		* @param urlImage
		*/
		setImage: function (urlImage, callback) {
			urlImage || (urlImage = this.settings.imgCrop.attr('src'));

			var _this = this;

			// validates if already or not was created the crop image
			if( this.settings.imgCrop.data('Jcrop') !== undefined ){
				this.jcrop_img = this.settings.imgCrop.data('Jcrop');

				// settings image crop
				this.jcrop_img.setImage(urlImage, function () {

					var dimImg = [];
					// settings image crop
					if( this.settings.configImg.minWidthImg && this.settings.configImg.minHeightImg ) {
						dimImg = [this.settings.configImg.minWidthImg, this.settings.configImg.minHeightImg];
					}else {
						dimImg = this.jcrop_img.getBounds();
					}

					methods.changeOptsCrop.call(_this, {
						imgSet: urlImage,
						minWidth: _this.settings.configImg.minWidthImg,
						minHeight: _this.settings.configImg.minHeightImg,
						imgWidth: dimImg[0],
						imgHeight: dimImg[1]
					});

					// Add values to the crop form
					_this.settings.formCrop.find('input#crop_type').val( 'url' );
					_this.settings.formCrop.find('input#file_name').val( urlImage );
					_this.settings.formCrop.find('input#file_type').val( urlImage.split('.').slice(-1) );
				});

			}else {

				this.settings.imgCrop.attr('src', urlImage);

				// create crop if does not exist
				methods.renderImageCrop.call(this, this.settings.imgCrop, function () {

					var dimImg = [];
					// settings image crop
					if( this.settings.configImg.minWidthImg && this.settings.configImg.minHeightImg ) {
						dimImg = [this.settings.configImg.minWidthImg, this.settings.configImg.minHeightImg];
					}else {
						dimImg = this.jcrop_img.getBounds();
					}

					methods.changeOptsCrop.call(this, {
						imgSet: urlImage,
						minWidth: this.settings.configImg.minWidthImg,
						minHeight: this.settings.configImg.minHeightImg,
						imgWidth: dimImg[0],
						imgHeight: dimImg[1]
					});

					// Add values to the crop form
					this.settings.formCrop.find('input#crop_type').val( 'url' );
					this.settings.formCrop.find('input#file_name').val( urlImage );
					this.settings.formCrop.find('input#file_type').val( urlImage.split('.').slice(-1) );

				}.bind(this));
			}

			// call callback
			if( $.isFunction(callback) )
				callback.call();
		},

		/**
		* Render FineUploader plugin for user product image
		*/
		renderUploaderImg: function ($uploaderImg) {

			if( !existUploaderPlugin() )
				return false;

			var _this = this;

			$uploaderImg.fineUploader({
				debug: false,
				template: this.settings.templateImgUploader,
				// session: {
				//     endpoint: document.url + Route.route('file.temp'),
				//     params: {
				//         'codigo_proyecto': 0
				//     }
				// },
				request: this.settings.uploadding,
				thumbnails: {
					placeholders: {
						waitingPath: 'img/waiting-generic.png',
						notAvailablePath: 'img/not_available-generic.png'
					}
				},
				autoUpload: true,
				multiple: false,
				validation: {
					image: {
						// minWidth: this.settings.configImg.minWidthImg || defaults.configImg.minWidthImg,
						// minHeight: this.settings.configImg.minHeightImg || defaults.configImg.minHeightImg,
						maxWidth: this.settings.configImg.maxWidthImg || defaults.configImg.maxWidthImg,
						maxHeight: this.settings.configImg.maxHeightImg || defaults.configImg.maxHeightImg
					},
					allowedExtensions: this.settings.configImg.allowedExtensions || defaults.configImg.allowedExtensions,
					sizeLimit: this.settings.configImg.sizeLimit || defaults.configImg.sizeLimit,
					itemLimit: 0
				},
				scaling: {
					sendOriginal: this.settings.configImg.sendOriginal || defaults.configImg.sendOriginal,
					defaultQuality: this.settings.configImg.defaultQuality || defaults.configImg.defaultQuality
				},
				// Events handlers
				callbacks: {
					onUpload: methods.onLoadImg.bind(this)
					// onComplete: methods.onCompleteLoadImg.bind(this)
				},
				dragAndDrop: {
					extraDropzones: this.settings.extraDropzones
				},
				showMessage: this.settings.showMessage,
				showConfirm: this.settings.showConfirm,
				showPrompt: this.settings.showPrompt
			});
		},

		/**
		* set image crop plugin
		*/
		renderImageCrop: function ($imgCrop, callback) {

			if( !existCropPlugin() )
				return false;

			//images crop
			var _this = this;

			$imgCrop.Jcrop({
				onSelect: methods.setCoords.bind(this),
				onChange: methods.setCoords.bind(this),
				onRelease: function () {
				},
				// minSize: [this.settings.configImg.minWidthImg, this.settings.configImg.minHeightImg],
				// maxSize: [this.settings.configImg.maxWidthImg, this.settings.configImg.maxHeightImg],
				bgColor: 'black',
				bgOpacity: .4,
				setSelect: [ 0, 0, this.settings.configImg.minWidthImg, this.settings.configImg.minHeightImg ],
				aspectRatio:  this.settings.configImg.minWidthImg / this.settings.configImg.minHeightImg,
				boxWidth: $(this.settings.imgCrop.parent()[0]).width(),
				boxHeight: 0,
				allowSelect: false,
				allowResize: true

			},function(){
				_this.jcrop_img = this;

				var dimDefault = _this.jcrop_img.getBounds();

				methods.changeOptsCrop.call(_this, {
					imgSet: $imgCrop.attr('src'),
					minWidth: _this.settings.configImg.minWidthImg,
					minHeight: _this.settings.configImg.minHeightImg,
					imgWidth: dimDefault[0],
					imgHeight: dimDefault[1]
				});

				if (typeof callback == 'function'){
					callback.call();
				}
			});
		},

		/**
		* Set select on image crop
		* @param Number imgWidth
		* @param Number imgHeight
		*/
		changeOptsCrop: function (options, callback) {

			var settings = {
				imgSet: '',
				minWidth: 0,
				minHeight: 0,
				imgWidth: 0,
				imgHeight: 0,
				dimSelect: [0,0],
				ix: 0,
				iy: 0
			};

			$.extend(settings, options);

			// set properties
			settings.dimSelect = setSquare(settings.imgWidth, settings.imgHeight);
			settings.ix = (settings.imgWidth - settings.dimSelect[0])/2;

			// refresh options crop
			this.jcrop_img.setOptions({
				trueSize: [ Math.floor(settings.imgWidth), Math.floor(settings.imgHeight) ]
				// outerImage: settings.imgSet
			});

			this.jcrop_img.setSelect( [settings.ix, settings.iy, settings.dimSelect[0], settings.dimSelect[1]] );

			this.settings.previewImg.attr('src', settings.imgSet);

			//run callback
			if (typeof callback == 'function') {
				callback.call();
			}
		},

		/**
		* submit event for image crop
		*/
		submitCropImage: function(e) {
			e.preventDefault();

			var _this = this;

			var data = formToJson( e.target );
			data.targ_w = this.settings.configImg.minWidthImg;
			data.targ_h = this.settings.configImg.minHeightImg;

			$.extend(data, this.settings.cropping.params);

			// emit callback
			if( $.isFunction(this.settings.callbacks['onCropping']) )
				this.settings.callbacks['onCropping'].call(this, this.jcrop_img);

			this.settings.formCrop.find(':submit').addClass('disabled');

			$.post(this.settings.cropping.endpoint, data, methods.onSuccessCrop.bind(this))
			 .fail(methods.onErrorCrop.bind(this));
		},

		// --------------
		// events handler
		// --------------
		/**
		* handler for set to coords of image crop
		* @param Object coords
		*/
		setCoords: function (coords){

			var ratioLesser = this.settings.configImg.minHeightImg / this.settings.configImg.minWidthImg;
			var dimImg = this.jcrop_img !== null ? this.jcrop_img.getBounds() : false,
				rx = $(this.settings.previewImg.parent()[0]).width() / coords.w,
				ry = (ratioLesser * $(this.settings.previewImg.parent()[0]).width()) / coords.h;

			// set content height of content preview
			$(this.settings.previewImg.parent()[0]).height( ratioLesser * $(this.settings.previewImg.parent()[0]).width() );

			this.settings.formCrop.find('input.crop-x').val( coords.x );
			this.settings.formCrop.find('input.crop-y').val( coords.y );
			this.settings.formCrop.find('input.crop-w').val( coords.w );
			this.settings.formCrop.find('input.crop-h').val( coords.h );

			// set preview image
			if( dimImg ){
				this.settings.previewImg.css({
					width: Math.round(rx * dimImg[0]) + 'px',
					height: Math.round(ry * dimImg[1]) + 'px',
					minWidth: Math.round(rx * dimImg[0]) + 'px',
					minHeight: Math.round(ry * dimImg[1]) + 'px',
					marginLeft: '-' + Math.round(rx * coords.x) + 'px',
					marginTop: '-' + Math.round(ry * coords.y) + 'px'
				});
			}
		},

		/**
		* will upload image
		* @param Number id
		* @param String name
		*/
		onLoadImg: function (id, name) {

			var $areaDrop = this.settings.uploaderImg.fineUploader('getDropTarget', id);

			if( $areaDrop !== undefined && $areaDrop.length ){
				if( $areaDrop.hasClass('image-area-drop') || $areaDrop.hasClass('wrapper-image-crop') ){

					methods.reassignActions.call(this);
					methods.setImage.call(this);
				}
			}

			if( $.isFunction(this.settings.callbacks['onLoadImg']) )
				this.settings.callbacks['onLoadImg'].call(this, this.settings.uploaderImg, id, name);
		},

		/**
		* complete event for upload image
		* @param Number id
		* @param String name
		* @param Object res
		* @param Object xhr
		*/
		onCompleteLoadImg: function (event, id, name, res) {

			var _this = this;

			if( !res.success )
				return;

			// settings image crop
			if( this.settings.imgCrop.data('Jcrop') !== undefined ) {

				this.jcrop_img.setImage(res.file_path, function () {

					var dimImg = [res.file_width, res.file_height];

					methods.changeOptsCrop.call(this, {
						imgSet: res.file_path,
						minWidth: this.settings.configImg.minWidthImg,
						minHeight: this.settings.configImg.minHeightImg,
						imgWidth: res.file_width,
						imgHeight: res.file_height

					}, function () {
						// emit callback
						if( $.isFunction(this.settings.callbacks['onCompleteLoad']) )
							this.settings.callbacks['onCompleteLoad'].call(this, this.settings.uploaderImg, id, name, res);
					}.bind(this));

				}.bind(this));

			}else {

				this.settings.imgCrop.attr('src', res.file_path);

				methods.renderImageCrop.call(this, this.settings.imgCrop, function () {

					methods.changeOptsCrop.call(this, {
						imgSet: res.file_path,
						minWidth: this.settings.configImg.minWidthImg,
						minHeight: this.settings.configImg.minHeightImg,
						imgWidth: res.file_width,
						imgHeight: res.file_height
					}, function () {
						// emit callback
						if( $.isFunction(this.settings.callbacks['onCompleteLoad']) )
							this.settings.callbacks['onCompleteLoad'].call(this, this.settings.uploaderImg, id, name, res);
					}.bind(this));

				}.bind(this));
			}

			// Add values to the crop form
			this.settings.formCrop.find('input#crop_type').val( 'name' );
			this.settings.formCrop.find('input#file_name').val( res.file_name );
			this.settings.formCrop.find('input#file_type').val( res.file_type );
		},

		/**
		* success event for crop image
		* @param Object res
		* @param String status
		* @param Object jqXHR
		*/
		onSuccessCrop: function (resp, status, jqXHR) {

			this.settings.formCrop.find(':submit').removeClass('disabled');

			// call crop complete
			if( $.isFunction(this.settings.callbacks['onCropComplete']) )
				this.settings.callbacks['onCropComplete'].call(this, this.jcrop_img, resp, jqXHR);
		},

		/**
		* error event for crop image
		* @param Object jqXHR
		* @param String status
		* @param String error
		*/
		onErrorCrop: function(jqXHR, status, error) {

			this.settings.formCrop.find(':submit').removeClass('disabled');

			// call crop error
			if( $.isFunction(this.settings.callbacks['onCropError']) )
				this.settings.callbacks['onCropError'].call(this, this.jcrop_img, jqXHR, error);
		}
	}

	// plugin class
	// instance the plugin
	// -------------------
	$.imageUploaderCrop = function (element, options) {
		options || (options = {});

		// parameters
		var plugin = this;

		// set attributes
		this.jcrop_img = null;
		this.element = element;
		this.$element = $(element);

		// initialize plugin
		if( $.isFunction(plugin.init) )
			plugin.init(element, options);
	}

	// extends prototype of plugin
	$.imageUploaderCrop.prototype = {

		// plugin's settings
		settings : {},

		/**
		* Constructor method
		*/
		init : function(element, options) {

			this.settings = $.extend({}, defaults, options);

			// check out if already was assigned the jcrop library
			if( this.settings.imgCrop && this.settings.imgCrop.data('Jcrop') !== undefined ){
				this.jcrop_img = this.settings.imgCrop.data('Jcrop');
				this.jcrop_img.destroy();
			}

			// Init image uploader and actions
			methods.reassignActions.call(this);
			methods.renderUploaderImg.call(this, this.settings.uploaderImg);
		},

		/**
		* -----------
		* Api methods
		* -----------
		*/

		/**
		* change Image
		* @param String urlImage
		* @param Function callback
		*/
		changeImage : function(urlImage, callback) {
			methods.reassignActions.call(this);
			methods.setImage.call(this, urlImage, callback);
		},

		/**
		* get image crop element
		*/
		getImgCrop : function () {
			return this.settings.imgCrop;
		},

		/**
		* get form crop element
		*/
		getFormCrop : function () {
			return this.settings.formCrop;
		},

		/**
		* get uploader image element
		*/
		getUploaderImg : function () {
			return this.settings.uploaderImg;
		},

		/**
		* get image preview element
		*/
		getPreviewImg : function () {
			return this.settings.previewImg
		},

		/**
		* destroy object plugin
		*/
		destroy : function () {
			methods.destroy.call(this);
		}
	};

	$.fn.imageUploaderCrop = function(optsOrCmd) {
		var self = this, selfArgs = arguments, retVals = [];

		if ( $(this).data('imageUploaderCrop') !== undefined && $.isFunction($(this).data('imageUploaderCrop')[optsOrCmd]) ) {

			var plug = $(this).data('imageUploaderCrop');
			return plug[optsOrCmd].apply(plug, slice.call(selfArgs, 1));

		} else if (typeof optsOrCmd === 'object' || !optsOrCmd) {

			return this.each(function(index, el) {

				var plugin = new $.imageUploaderCrop(this, optsOrCmd);

				$(this).data('imageUploaderCrop', plugin);
			});

		} else {
			$.error( 'Method "' +  optsOrCmd + '" does not exist in imageUploaderCrop - (krobing) plugin!');
		}
	}

}));
