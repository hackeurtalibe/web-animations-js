module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-gjslint');
  grunt.loadNpmTasks('grunt-checkrepo');
  grunt.loadNpmTasks('grunt-git-status');

  var targetConfig = require('./target-config.js');

  var uglifyTargets = {};
  var genTargets = {};
  var testTargets = {};
  for (var target in targetConfig) {
    var suffix = target === targetConfig.defaultTarget ? '' : '-' + target;
    uglifyTargets[target] = {
      options: {
        sourceMap: true,
        sourceMapName: 'web-animations' + suffix + '.min.js.map',
        banner: grunt.file.read('templates/boilerplate'),
        wrap: true,
        compress: {
          global_defs: {
            "WEB_ANIMATIONS_TESTING": false
          },
          dead_code: true
        },
        mangle: {
          eval: true
        },
      },
      nonull: true,
      dest: 'web-animations' + suffix + '.min.js',
      src: targetConfig[target].src,
    };
    genTargets[target] = targetConfig[target];
    testTargets[target] = {};
  }

  grunt.initConfig({
    uglify: uglifyTargets,
    gen: genTargets,
    checkrepo: {
      all: {
        clean: true,
      },
    },
    'git-status': {
      all: {
      },
    },
    gjslint: {
      options: {
        flags: [
          '--nojsdoc',
          '--strict',
          '--disable 7,121,110', //   7: Wrong blank line count
                                 // 121: Illegal comma at end of object literal
                                 // 110: Line too long
        ],
        reporter: {
          name: 'console'
        }
      },
      all: {
        src: [
          'src/*.js',
          'test/*.js',
          'test/js/*.js',
        ],
      }
    },
    test: testTargets,
  });

  grunt.task.registerMultiTask('gen', 'Generate web-animations-<target>.js, web-animations-<target>.html, test/runner-<target>.js', function() {
    var target = this.target;
    var config = targetConfig[target];

    (function() {
      var template = grunt.file.read('templates/web-animations.js')
      var filename = 'web-animations' + (target === targetConfig.defaultTarget ? '' : '-' + target) + '.js';
      var contents = grunt.template.process(template, {data: {target: target}});
      grunt.file.write(filename, contents);
      grunt.log.writeln('File ' + filename + ' created');
    })();

    (function() {
      var template = grunt.file.read('templates/web-animations.html')
      var filename = 'web-animations' + (target === targetConfig.defaultTarget ? '' : '-' + target) + '.html';
      var contents = grunt.template.process(template, {data: {src: config.src}});
      grunt.file.write(filename, contents);
      grunt.log.writeln('File ' + filename + ' created');
    })();

    (function() {
      var template = grunt.file.read('templates/runner.html')
      var filename = 'test/runner' + (target === targetConfig.defaultTarget ? '' : '-' + target) + '.html';
      var contents = grunt.template.process(template, {data: {target: target}});
      grunt.file.write(filename, contents);
      grunt.log.writeln('File ' + filename + ' created');
    })();
  });

  grunt.task.registerMultiTask('test', 'Run <target> tests under Karma', function() {
    var done = this.async();
    var karmaConfig = require('./test/karma-config.js');
    var config = targetConfig[this.target];
    karmaConfig.files = ['test/runner.js'].concat(config.src, config.test);
    var karmaServer = require('karma').server;
    karmaServer.start(karmaConfig, function(exitCode) {
      done(exitCode === 0);
    });
  });

  grunt.task.registerTask('clean', 'Remove files generated by grunt', function() {
    grunt.file.expand('web-animations-*').concat(grunt.file.expand('test/runner-*.html')).forEach(function(file) {
      grunt.file.delete(file);
      grunt.log.writeln('File ' + file + ' removed');
    });
  });

  for (var target in targetConfig) {
    grunt.task.registerTask(target, [
      'uglify:' + target,
      'gen:' + target,
      'gjslint',
    ]);
  }

  grunt.task.registerTask('default', ['uglify', 'gen', 'gjslint']);
};
