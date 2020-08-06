const gulp = require('gulp');
const gulpIstanbul = require('gulp-istanbul');
const gulpMocha = require('gulp-mocha');

/**
 * Run before tests. Instruments source files for coverage.
 */
gulp.task('pre-test', () => {
    return gulp.src(['./src/**/*.js'])
        .pipe(gulpIstanbul()) // cover files
        .pipe(gulpIstanbul.hookRequire()); // return covered files when require()'d
});


/**
 * Run tests and write results. 
 */
gulp.task('test', ['pre-test'], () => {
    return gulp.src('./test/**/test*.js')
        .pipe(gulpMocha()) // run tests
        .pipe(gulpIstanbul.writeReports({ // write reports
            dir: './.build/coverage',
            reporters: ['lcov', 'clover', 'text-summary']
        }));
});