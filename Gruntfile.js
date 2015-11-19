var fs = require('fs')

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    grunt.initConfig({

        watch: {
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass'],
            },
            inlinejs: {
                files: ['src/js/**/*', 'src/templates/**/*'],
                tasks: ['shell:inlinejs'],
            },
            bootjs: {
                files: ['src/js/boot.js'],
                tasks: ['template:bootjsdev'],
            },
        },

        clean: {
            build: ['build']
        },

        sass: {
            options: {
                sourceMap: true
            },
            interactive: {
                files: {
                    'build/main.css': 'src/css/main.scss'
                }
            }
        },

        'template': {
            'bootjsdev': {
                'data': { 'assetPath': '' },
                'files': { 'build/boot.js': ['src/js/boot.js'] }
            },
            'bootjsprod': {
                'data': { 'assetPath': grunt.file.readJSON('./s3cfg.json').path },
                'files': { 'build/boot.js': ['src/js/boot.js'] }
            }

        },


        shell: {
            options: {
                execOptions: { cwd: '.' }
            },
            iframedjs: {
                command: './node_modules/.bin/jspm bundle-sfx -m src/js/main build/main.js'
            },
            inlinejs: {
                command: './node_modules/.bin/jspm bundle-sfx -m src/js/main build/inlined.js --format amd'
            }
        },

        aws: grunt.file.readJSON('./aws-keys.json'),

        aws_s3: {
            options: {
                accessKeyId: '<%= aws.AWSAccessKeyId %>',
                secretAccessKey: '<%= aws.AWSSecretKey %>',
                region: 'us-east-1',
                uploadConcurrency: 10, // 5 simultaneous uploads
                downloadConcurrency: 10, // 5 simultaneous downloads
                debug: grunt.option('dry'),
                bucket: 'gdn-cdn',
                differential: true
            },
            production: {
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            'prod.html', 'build/main.js', 'build/main.js.map', 'build/main.css', 'build/main.css.map',
                            'src/img/**/*', 'src/video/**/*',
                            // data
                            'data/out/indonesia.topojson',
                        ],
                        dest: 'embed/indonesia/',
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8000,
                    base: '.',
                    middleware: function (connect, options, middlewares) {
                        // inject a custom middleware http://stackoverflow.com/a/24508523
                        middlewares.unshift(function (req, res, next) {
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.setHeader('Access-Control-Allow-Methods', '*');
                            if (req.originalUrl.indexOf('/jspm_packages/') === 0 ||
                                req.originalUrl.indexOf('/bower_components/') === 0) {
                                res.setHeader('Cache-Control', 'public, max-age=315360000');
                            }
                            return next();
                        });
                        return middlewares;
                    }
                }
            }
        }
    });

    grunt.registerTask('deploy', ['clean', 'sass', 'shell:iframedjs', 'aws_s3:production']);
    grunt.registerTask('default', ['clean', 'sass', 'connect', 'watch:css']);
    grunt.registerTask('dev:inline', ['clean', 'sass', 'shell:inlinejs', 'template:bootjsdev', 'connect', 'watch']);
}
