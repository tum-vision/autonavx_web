requirejs.config({
	paths: {
		'static': '../static/exercise1_path/',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'jquery': 'jquery.min',
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
		},
	}
});

require(['require', 'domReady', 'jquery', 'init/editor', 'init/viewer', 'init/edx_state', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))
		var viewer = require('init/viewer')($('#viewport').get(0));

		var beacons_active_count = 0;

		require('init/edx_state')({
			'set_state': function(state) {
				if(state['code']) {
					editor.getSession().setValue(state['code'])
				}
			},
			'get_state': function() {
				return { 'code': editor.getSession().getValue() };
			},
			'get_grade': function() {
				return { 'active_beacons': beacons_active_count }
			},
			'tries': 5,
		});
		
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var augment_user_code = require('python/internal_code');
		
		var simulation = require('python/simulation_proxy')(vm);

		var update_simulation_buttons = function(running) {
			$('#run-simulation').prop('disabled', running);
			$('#stop-simulation').prop('disabled', !running);
		};
		update_simulation_buttons(false);

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

		var beacons = [];
		beacons.push(viewer.createBeacon([1, -2, 1]));
		beacons.push(viewer.createBeacon([1,  0, 1]));
		beacons.push(viewer.createBeacon([1,  2, 1]));
		
		beacons.push(viewer.createBeacon([3, -2, 1]));
		beacons.push(viewer.createBeacon([3,  0, 1]));
		beacons.push(viewer.createBeacon([3,  2, 1]));
		
		beacons.push(viewer.createBeacon([5, -2, 1]));
		beacons.push(viewer.createBeacon([5,  0, 1]));
		beacons.push(viewer.createBeacon([5,  2, 1]));
		
		$('#run-simulation').click(function() {
			update_simulation_buttons(true);
			viewer.focus();

			var code = augment_user_code(editor.getSession().getValue());

			logview.empty();
			viewer.reset();
			$.each(beacons, function(idx, beacon) {
				beacon.setInactive();
			});
			beacons_active_count = 0;
			
			editor.getSession().setAnnotations([]);

			simulation.initialize();
			
			var success = simulation.run(code, function(time, data) {
				$.each(data, function(type, value) {
					if(plot_fcns[type] !== undefined) {
						plot_fcns[type](time, value);
					}
				});
				
				$.each(beacons, function(idx, beacon) {
					if(!beacon.isActive() && beacon.distanceToDrone() < 0.5) {
						beacon.setActive();
						beacons_active_count += 1;
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
