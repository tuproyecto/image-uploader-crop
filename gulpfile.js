/*jslint node: true */
"use strict";

var gulp   		    = require('gulp'),
	jshint 		    = require('gulp-jshint'),
	notify 		    = require("gulp-notify"),
	concat 		    = require('gulp-concat'),
	sourcemaps      = require('gulp-sourcemaps'),
	uglify		    = require('gulp-uglify'),
    sass            = require('gulp-sass'),
    autoprefixer    = require('gulp-autoprefixer'),
    cleanCSS        = require('gulp-clean-css'),
    merge           = require('merge-stream');

// Browsers to target when prefixing CSS.
var COMPATIBILITY = [
  'last 2 versions',
  'ie >= 9',
  'Android >= 2.3'
];

// File paths to various assets are defined here.
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

// Compile Sass into CSS
gulp.task('sass', function() {
  return gulp.src('src/image-uploader-crop.scss')
    .pipe(sourcemaps.init())
    .pipe(sass())
    .on('error', notify.onError({
        message: "<%= error.message %>",
        title: "Sass Error"
    }))
    // .pipe(autoprefixer({
    //   browsers: COMPATIBILITY
    // }).on('error', function (err) {
    //     console.log( err );
    // }))
    // Minify CSS
    .pipe(gulp.dest('src/'))
    .pipe(concat('image-uploader-crop.min.css'))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
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

// Task for watch changes
gulp.task('watch', function () {
    // Log file changes to console
    function logFileChange(event) {
        var fileName = require('path').relative(__dirname, event.path);
        console.log('[' + 'WATCH'.green + '] ' + fileName.magenta + ' was ' + event.type + ', running tasks...');
    }

    // Sass watch
    gulp.watch('src/*.scss', ['sass'])
        .on('change', function(event) {
            logFileChange(event);
        });
});

// Default gulp task
gulp.task('default', ['copy', 'sass', 'javascript']);
