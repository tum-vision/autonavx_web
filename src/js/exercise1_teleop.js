requirejs.config({
	paths: {
		'jquery': 'jquery.min',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'THREE/TrackballControls': 'three/TrackballControls',
		'THREE/ColladaLoader': 'three/ColladaLoader',
		'Skulpt': 'visnav_edx_skulpt.min',
		'Skulpt/Stdlib': 'visnav_edx_skulpt-stdlib',
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
		}
	}
});

require(['require', 'domReady', 'jquery', 'init/viewer', 'init/keybindings', 'python/vm', 'python/simulation_proxy'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		viewer = require('init/viewer')($('#viewport').get(0));

		vm = require('python/vm')(undefined);
		var simulation = require('python/simulation_proxy')(vm);

		var update_simulation_buttons = function(running) {
			$('#run-simulation').prop('disabled', running);
			$('#stop-simulation').prop('disabled', !running);
		};
		update_simulation_buttons(false);

		simulation_input = {
			'changed':         true,
			'make_waypoint':   true,
			'vx':              0.0,
			'vy':              0.0,
			'vyaw':            0.0,
			'vz':              0.0,
		};

		require('init/keybindings')(viewer, simulation_input);

		plot_fcns = {
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

			var code = undefined;
			
			viewer.reset();

			simulation.initialize();
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
			    console.log(error);
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
