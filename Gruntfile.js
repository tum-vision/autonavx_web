module.exports = function(grunt) {
	grunt.initConfig({

		//package configuration by bower
		pkg: grunt.file.readJSON('package.json'),

		//clean task: empty the build/ folder
		clean: ['build/'],

		//copy task: copy needed files to the webserver directory
		copy: {
			main: {
				files: [
					{ expand: true, cwd: 'src/js/', src: '**/*.js', dest: 'build/js/' },
					{ expand: true, flatten: true, src: 'src/**/*.css', dest: 'build/css/' },
					{ expand: true, flatten: true, src: 'src/**/*.html', dest: 'build/' },
					{ expand: true, src: 'assets/**/*', dest: 'build/' },
				]
			},
			static: {
				files: [
					{ expand: true, cwd: 'src/static/', src: ['**/*.py', '!**/solution.py'], dest: 'build/static/' },
				],
			
				options: {
					process: function(content, srcpath) {
						// replace all tabs with 4 spaces
						return content.replace(/\t/g, "    ")
					},	
				},
			
			},

			//skulpt js-python files
			skulpt: {
				files: [
					{ expand: true, flatten: true, src: 'vendor/visnav_edx_skulpt/dist/{visnav_edx_skulpt,visnav_edx_skulpt.min,visnav_edx_skulpt-stdlib}.js', dest: 'build/js/' },
				]
			},

			dependencies: {
				files: [
					{ expand: true, flatten: true, src: 'vendor/bootstrap/dist/css/*.min.css', dest: 'build/css/' },
					{ expand: true, flatten: true, src: 'vendor/bootstrap/dist/fonts/*', dest: 'build/fonts/' },
					{ expand: true, flatten: true, src: 'vendor/rickshaw/src/css/*.css', dest: 'build/css/' },
					{ expand: true, flatten: true, src: 'vendor/rickshaw/examples/css/*.css', dest: 'build/css/' },
					{ expand: true, flatten: true, src: 'vendor/bootstrap/js/button.js', dest: 'build/js/bootstrap/' },
					{ expand: true, flatten: true, src: 'vendor/jquery/dist/jquery.min.js', dest: 'build/js/' },
					{ expand: true, flatten: true, src: 'vendor/requirejs-text/text.js', dest: 'build/js/' },
					{ expand: true, flatten: true, src: 'vendor/**/{require,domReady,three.min,d3,rickshaw.min,math.min}.js', dest: 'build/js/' },
					{ expand: true, cwd: 'vendor/ace/lib/ace/', src: ['**/*.*', '!**/_test/*'], dest: 'build/js/ace/' },
				]
			}
		},

		//shell task: the invokation for rebuilding skulpt
		shell: {
			make_skulpt: {
				options: {
					stdout: true
				},
				command: 'make -C vendor/visnav_edx_skulpt'
			}
		},

		//watch task: rebuild and copy when files change
		watch: {
			framework: {
				files: [ "src/**" ],
				tasks: [ 'copy:main', 'copy:static' ]
			},
			skulpt: {
				files: [ "vendor/visnav_edx_skulpt/src/**" ],
				tasks: [ 'shell:make_skulpt', 'copy:skulpt' ]
			},
		},

		//launch webserver with build/ as root dir
		connect: {
			server: {
				options: {
					base: 'build/'
				}
			}
		},

		//open the user's webbrowser
		open: {
			all: {
				// Gets the port from the connect configuration
				path: 'http://localhost:8000/test.html'
			}
		}
	});

	//activate grunt plugins handlers
	grunt.loadNpmTasks('grunt-contrib-clean');   //for the cleaning
	grunt.loadNpmTasks('grunt-contrib-watch');   //for the file change watching
	grunt.loadNpmTasks('grunt-contrib-copy');    //for copying needed files
	grunt.loadNpmTasks('grunt-shell');           //for rebuilding skulpt
	//grunt.loadNpmTasks('grunt-bower-task');
	grunt.loadNpmTasks('grunt-contrib-connect'); //for launching the webserver
	grunt.loadNpmTasks('grunt-open');            //for launching the webbrowser
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	
	//grunt will perform these actions in order
	grunt_actions = [
		'copy:main',
		'copy:static',
		'copy:skulpt',
		'copy:dependencies',
		'connect',
		'open',
		'watch'
	]

	grunt.registerTask('default', grunt_actions);
}
