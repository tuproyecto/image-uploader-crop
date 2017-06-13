/*jslint node: true */
"use strict";

var gulp   		= require('gulp'),
	jshint 		= require('gulp-jshint'),
	notify 		= require("gulp-notify"),
	concat 		= require('gulp-concat'),
	sourcemaps  = require('gulp-sourcemaps'),
	uglify		= require('gulp-uglify'),
	merge       = require('merge-stream');

var PATHS = {
	'modules': './node_modules/'
}

// Lint JS files
gulp.task('lint', function () {
	return gulp.src('src/image-uploader-crop.js')
		.pipe(jshint())
		.pipe(notify(function (file) {
			if (file.jshint.success) {
				return false;
			}

			var errors = file.jshint.results.map(function (data) {
				if (data.error) {
					return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason;
				}
			}).join("\n");
			return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors;
		}));
});

// minify JavaScript
gulp.task('javascript', ['lint'], function () {
	var _uglify = uglify()
		.on('error', notify.onError({
			message: "<%= error.message %>",
			title: "Uglify JS Error"
		}));

	return gulp.src('src/image-uploader-crop.js')
		.pipe(sourcemaps.init())
		.pipe(concat('image-uploader-crop.min.js', {
			newLine:'\n;'
		}))
		.pipe(_uglify)
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('src/'));
});

// Copy task
gulp.task('copy', function (argument) {

	// fine-uploader
	var fineUploaderPh = gulp.src(PATHS.modules +'fine-uploader/fine-uploader/placeholders/*.*')
		.pipe(gulp.dest('src/img/'));

	var fineUploaderIcons = gulp.src(PATHS.modules +"fine-uploader/fine-uploader/*.gif")
		.pipe(gulp.dest('src/img/'));

	return merge(fineUploaderPh, fineUploaderIcons);
});

// Default gulp task
gulp.task('default', ['copy', 'javascript']);
