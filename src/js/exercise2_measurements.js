requirejs.config({
	paths: {
		'static': '../static/exercise2_measurements/',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'jquery': 'jquery.min',
		'THREE/TrackballControls': 'three/TrackballControls',
		'THREE/ColladaLoader': 'three/ColladaLoader',
		'Skulpt': 'visnav_edx_skulpt.min',
		'Skulpt/Stdlib': 'visnav_edx_skulpt-stdlib',
		'd3': 'd3',
		'Rickshaw': 'rickshaw.min',
	},
	shim: {
		'Skulpt': {
			exports: 'Sk'
		},
		'Skulpt/Stdlib': {
			deps: ['Skulpt'],
			exports: 'Sk.builtinFiles',
		},
		'THREE': {
			exports: 'THREE'
		},
		'THREE/TrackballControls': {
			deps: ['THREE'],
			exports: 'THREE.TrackballControls'
		},
		'THREE/ColladaLoader': {
			deps: ['THREE'],
			exports: 'THREE.ColladaLoader'
		},
		'Rickshaw': {
			deps: ['d3/global'],
			exports: 'Rickshaw',
		}
	}
});

// see https://github.com/mbostock/d3/issues/1693
// only works with d3 and not d3.min
define("d3/global", ["d3"], function(_) {
  d3 = _;
});

require(['require', 'domReady', 'jquery', 'init/editor', 'init/grapher', 'init/viewer', 'init/keybindings', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))
		var grapher = require('init/grapher')($('#grapher').get(0));
		var viewer = require('init/viewer')($('#viewport').get(0));

		// TODO: replace with some better mvc code
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var augment_user_code = require('python/internal_code');
		var simulation = require('python/simulation_proxy')(vm);

		var update_simulation_buttons = function(running) {
			// TODO: disable editor during simulation?! or set keyboard focus to canvas once simulation starts
			$('#run-simulation').prop('disabled', running);
			$('#stop-simulation').prop('disabled', !running);
		};
		update_simulation_buttons(false);

		var simulation_input = {
			'changed':         true,
			'make_waypoint':   true,
			'vx':              0.0,
			'vy':              0.0,
			'vyaw':            0.0,
			'vz':              0.0,
		};

		require('init/keybindings')(viewer, simulation_input);
		
		var last_render = 0;
		
		plot_fcns = {
			'scalar': function(time, scalars) {
				grapher.refreshGraph(time, scalars);
				if((time - last_render) > 0.5) {
					grapher.render();
					last_render = time;
				}
			},
			'pose': function(time, poses) {
				viewer.setOverlayText(time.toPrecision(3) + "s");

				if(poses['ardrone'] !== undefined) {
					viewer.setDronePose(poses['ardrone'][0]);
				}
			},
			'motor_command': function(time, commands) {
				if(commands['ardrone'] !== undefined) {
					viewer.setDroneMotorCommands(commands['ardrone'][0]);
				}
			},
			'trajectory': function(time, trajectories) {
				$.each(trajectories, function(name, points) {
					viewer.updateTrajectory(name, points);
				});
			},
		};

		$('#run-simulation').click(function() {
			update_simulation_buttons(true);
			viewer.focus();

			var code = augment_user_code(editor.getSession().getValue());

			logview.empty();
			viewer.reset();
			grapher.reset();
			last_render = -1e5;
			var simulation_step_count = 0;
			editor.getSession().setAnnotations([]);

			simulation.initialize();
			// TODO: set frequencies for callbacks, i.e., input 20Hz, pose update 60Hz, ...
			var success = simulation.run(code, function(time, data) {
				simulation.setInput(simulation_input);
				
				$.each(data, function(type, value) {
					if(plot_fcns[type] !== undefined) {
						plot_fcns[type](time, value);
					}
				});
			}, function() {
				update_simulation_buttons(false);
			}, function(error) {
			    if(error.filename == '<stdin>.py') {
					editor.getSession().setAnnotations([{
						text: error.message,
						type: 'error',
						row: error.lineno - 1
					}]);
				} else {
					console.log(error);
				}
			}, {
				'async': true,
				'duration': Infinity,
			});
			
			if(!success) {
				update_simulation_buttons(false);
			}
		});

		$('#stop-simulation').click(function() {
			simulation.stop();
		});
	})
});
