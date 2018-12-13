// Karma configuration
// Generated on Sun Nov 18 2018 16:48:25 GMT+0800 (CST)

var paths = {};

module.exports = function(config) {
  config.set({
    // Set globally available variables
    globals: {
        paths: JSON.stringify(paths)
    },

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    plugins: [
        'karma-chai',
        'karma-chai-as-promised',
        'karma-chai-sinon',
        'karma-chrome-launcher',
        'karma-coverage',
        'karma-coverage-istanbul-reporter',
        'karma-coveralls',
        'karma-global-preprocessor',
        'karma-html-reporter',
        'karma-html2js-preprocessor',
        'karma-istanbul',
        'karma-mocha',
        'karma-mocha-reporter',
        'karma-requirejs'
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai-sinon'],


    // list of files / patterns to load in the browser
    files: [
        'lib/esl.js',
        'test-main.js',
        'test/utils/*.html',
        'test/utils/*.js',
        { pattern: 'utils/*.js', included: false },
        { pattern: 'test/utils/*.spec.js', included: false },
        { pattern: 'amd_modules/**/*.js', included: false }
    ],


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        'test-main.js': ['global'],
        // source files, that you wanna generate coverage for
        // do not include tests or libraries
        // (these files will be instrumented by Istanbul)
        'utils/*.js': ['coverage'],
        'test/utils/*.html': ['html2js']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],
    htmlReporter: {
        outputDir: 'test-reports/result'
    },
    coverageReporter: {
        reporters: [
            {
                type: 'html',
                dir: 'test-reports/coverage' // relative to basePath
            }, {
                type: 'text-summary'
            }, {
                type: 'lcov',
                dir: 'test-reports/coverage'
            }
        ]
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [process.env.BROWSER || 'ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
