'use strict';

var mountFolder = function (connect, dir) {
  return connect.static(require('path').resolve(dir));
};

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // configurable paths
  var yeomanConfig = {
    app: 'app',
    dist: 'dist'
  };

  grunt.initConfig({
    chromeManifest: {
      dist: {
        options: {
          buildnumber: true,
          indentSize: 2,
          background: {
            target: 'scripts/background.js'
          }
        },
        src: '<%= yeoman.app %>',
        dest: '<%= yeoman.dist %>'
      },
      local: {
        options: {
          buildnumber: false,
          indentSize: 2,
          background: {
            target: 'scripts/background.js'
          }
        },
        src: '<%= yeoman.app %>',
        dest: '<%= yeoman.dist %>'
      },
    },
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '.sass-cache',
            '<%= yeoman.dist %>',
            'package'
          ]
        }]
      },
      local: {
        files: [{
          dot: true,
          src: [
            '<%= yeoman.app %>/scripts/**/*.map',
            '<%= yeoman.app %>/scripts/*.js',
            '<%= yeoman.app %>/scripts/popup/*.js'
          ]
        }]
      }
    },
    coffee: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/scripts',
          src: '{,*/}*.coffee',
          dest: '<%= yeoman.app %>/scripts',
          ext: '.js'
        }]
      },
      local: {
        options: {
          sourceMap: false
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/scripts',
          src: '{,*/}*.coffee',
          dest: '<%= yeoman.app %>/scripts',
          ext: '.js'
        }]
      },
      test: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/scripts',
          src: '{,*/}*.coffee',
          dest: '.tmp/scripts',
          ext: '.js'
        }]
      }
    },
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>/styles',
        cssDir: '.tmp/styles',
        generatedImagesDir: '.tmp/images/generated',
        imagesDir: '<%= yeoman.app %>/images',
        javascriptsDir: '<%= yeoman.app %>/scripts',
        fontsDir: '<%= yeoman.app %>/styles/fonts',
        httpImagesPath: '/images',
        httpGeneratedImagesPath: '/images/generated',
        relativeAssets: false
      },
      dist: {},
      local: {
        options: {
          debugInfo: true
        }
      }
    },
    compress: {
      dist: {
        options: {
          archive: 'package/@Delicious.zip'
        },
        files: [{
          expand: true,
          cwd: 'dist/',
          src: ['**'],
          dest: ''
        }]
      }
    },
    concurrent: {
      test: [
        'coffee:test'
      ],
      dist: [
        'markdown',
        'compass:dist',
        'imagemin',
        'svgmin',
        'htmlmin'
      ],
      local: [
        'markdown',
        'compass:local',
        'imagemin',
        'svgmin',
        'htmlmin'
      ]
    },
    connect: {
      options: {
        hostname: '*',
        keepalive: true,
        open: true,
        port: 9000
      },
      test: {
        options: {
          middleware: function (connect) {
            return [
              mountFolder(connect, 'dist'),
              mountFolder(connect, 'test'),
            ];
          }
        }
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{ico,png,txt}',
            'images/{,*/}*.{webp,gif}',
            '_locales/{,*/}*.json'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/images',
          src: [
            'generated/*'
          ]
        }]
      },
      local: {
        expand: true,
        dot: true,
        cwd: '<%= yeoman.app %>',
        dest: '<%= yeoman.dist %>',
        src: [
          '*.{ico,png,txt}',
          'images/{,*/}*.{webp,gif}',
          '_locales/{,*/}*.json',
          // 'scripts/{,*/}*.coffee',
          'scripts/{,*/}*.map',
          'scripts/contentscript.js',
          'scripts/context.js',
          'scripts/vendor/jquery-2.1.0.js'
        ]
      }
    },
    cssmin: {
      dist: {
        files: {
          '<%= yeoman.dist %>/styles/main.css': [
            '.tmp/styles/main.css'
          ],
          '<%= yeoman.dist %>/styles/contentscript.css': [
            '.tmp/styles/contentscript.css'
          ],
          '<%= yeoman.dist %>/styles/options.css': [
            '.tmp/styles/options.css'
          ],
          '<%= yeoman.dist %>/styles/markdown.css': [
            '.tmp/styles/markdown.css'
          ]
        }
      }
    },
    htmlmin: {
      dist: {
        options: {
          // collapseWhitespace: true,
          // collapseBooleanAttributes: true,
          // removeAttributeQuotes: true,
          // removeRedundantAttributes: true,
          // useShortDoctype: true,
          // removeEmptyAttributes: true,
          // removeOptionalTags: true
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>',
          src: '*.html',
          dest: '<%= yeoman.dist %>'
        }]
      }
    },
    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg}',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        '<%= yeoman.app %>/scripts/{,*/}*.js',
        'test/spec/{,*/}*.js'
      ]
    },
    markdown: {
      all: {
        files: [{
          expand: true,
          src: '<%= yeoman.app %>/docs/*.md',
          dest: '<%= yeoman.dist %>/docs/',
          ext: '.html',
          flatten: true
        }],
        options: {
          template: '<%= yeoman.app %>/docs/template.html'
        }
      }
    },
    mocha: {
      all: {
        options: {
          run: true,
          urls: ['http://localhost:<%= connect.options.port %>/index.html']
        }
      }
    },
    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },
    uglify: {
      options: {
        beautify: {
          ascii_only: true
        },
        mangle: false,
        report: 'min'
      },
      my_target: {
        files: [{
          expand: true,
          src: '<%= yeoman.app %>/scripts/*.js',
          dest: '<%= yeoman.dist %>'
        }, {
          expand: true,
          src: '<%= yeoman.app %>/scripts/vendor/jquery-2.1.0.js',
          dest: '<%= yeoman.dist %>'
        }]
      }
    },
    usemin: {
      options: {
        dirs: ['<%= yeoman.dist %>']
      },
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css']
    },
    useminPrepare: {
      options: {
        dest: '<%= yeoman.dist %>'
      },
      html: [
        '<%= yeoman.app %>/popup.html',
        '<%= yeoman.app %>/options.html'
      ]
    },
    watch: {
      options: {
        spawn: false
      },
      coffee: {
        files: ['<%= yeoman.app %>/scripts/{,*/}*.coffee'],
        tasks: ['local']
      },
      coffeeTest: {
        files: ['test/spec/{,*/}*.coffee'],
        tasks: ['coffee:test']
      },
      compass: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
        tasks: ['local']
      },
      html: {
        files: ['<%= yeoman.app %>{,*/}*.html'],
        tasks: ['local']
      }
    },
    yeoman: yeomanConfig
  });

  // Tasks
  grunt.registerTask('build', [
    'coffee:dist',
    'clean:dist',
    'chromeManifest:dist',
    'useminPrepare',
    'concurrent:dist',
    'concat',
    'cssmin',
    'uglify',
    'copy:dist',
    'usemin',
    'compress',
    'clean:local'
  ]);

  grunt.registerTask('local', [
    'coffee:local',
    'clean:dist',
    'chromeManifest:local',
    'useminPrepare',
    'concurrent:local',
    'concat',
    'cssmin',
    'copy:local',
    'usemin',
    'clean:local'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'build'
  ]);

};
