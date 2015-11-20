var fs = require('fs')
var ini = require('ini')
var path = require('path')

function getAWSCredentials(grunt, cfg) {
    var awsCredentialsFilePath = cfg.credentialsFile.replace('$HOME', process.env['HOME']);
    if (!fs.existsSync(awsCredentialsFilePath)) {
        grunt.log.warn('Credentials file missing: ' + awsCredentialsFilePath);
        return
    }
    var iniFile = ini.parse(fs.readFileSync(awsCredentialsFilePath, 'utf-8'));
    if (iniFile[cfg.profile]) {
        grunt.log.ok('Using AWS credentials ' + cfg.profile + ' profile');
        return iniFile[cfg.profile];
    }

    grunt.log.warn('AWS Credentials profile ' + cfg.profile + ' does not exist. Using default credentials.')
    return iniFile.default;
}

module.exports = function(grunt) {

    require('jit-grunt')(grunt);

    var s3 = require('./s3cfg.json');
    var awsCredentials = getAWSCredentials(grunt, s3);

    grunt.initConfig({

        watch: {
            css: {
                files: ['src/css/**/*'],
                tasks: ['sass'],
            },
            inlinejs: {
                files: ['src/js/**/*', 'src/templates/**/*', '!src/js/boot.js'],
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
                'options': { 'data': { 'assetPath': '' } },
                'files': { 'build/boot.js': ['src/js/boot.js'] }
            },
            'bootjsprod': {
                'options': { 'data': { 'assetPath': s3.domain + s3.path } },
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

        aws_s3: {
            options: {
                accessKeyId: awsCredentials.aws_access_key_id,
                secretAccessKey: awsCredentials.aws_secret_access_key,
                region: 'us-east-1',
                uploadConcurrency: 10, // 5 simultaneous uploads
                downloadConcurrency: 10, // 5 simultaneous downloads
                debug: grunt.option('dry'),
                bucket: s3.bucket,
                differential: true
            },
            inline: {
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: [
                            'build/boot.js', 'build/inlined.js', 'build/inlined.js.map', 'build/main.css', 'build/main.css.map'
                        ],
                        dest: s3.path,
                        params: { CacheControl: 'max-age=60' }
                    }
                ]
            },
            iframe: {
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
                        dest: s3.path,
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

    grunt.registerTask('logBootURL', function() {
        grunt.log.ok('BOOTURL: ' + s3.domain + s3.path + '/build/boot.js');
    })

    // grunt.registerTask('deploy:iframe', ['clean', 'sass', 'shell:iframedjs', 'aws_s3:iframe']);
    grunt.registerTask('deploy:inline', ['clean', 'sass', 'shell:inlinejs', 'template:bootjsprod', 'aws_s3:inline', 'logBootURL']);

    grunt.registerTask('default', ['clean', 'sass', 'connect', 'watch:css']);
    grunt.registerTask('dev:inline', ['clean', 'sass', 'shell:inlinejs', 'template:bootjsdev', 'connect', 'watch']);
}
