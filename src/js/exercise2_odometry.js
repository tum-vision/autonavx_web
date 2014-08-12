requirejs.config({
	paths: {
		'static': '../static/exercise2_odometry/',
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

require(['require', 'domReady', 'jquery', 'init/editor', 'init/viewer', 'init/edx_state', 'init/submission_guard', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))
		var viewer = require('init/viewer')($('#viewport').get(0));

		// TODO: replace with some better mvc code
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var augment_user_code = require('python/internal_code');
		var simulation = require('python/simulation_proxy')(vm);

		var submission_guard = require('init/submission_guard')($('#run-simulation-alert').get(0));
		
		var simulation_time = -1;
		var groundtruth_trajectory = [];
		var recorded_trajectories = {};

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
				submission_guard.check(simulation_time > 120, 'You have to run the simulation for at least 120 seconds!');
				submission_guard.check(Object.keys(recorded_trajectories).length > 0, 'You have to call the plot_trajectory function!');
				
				var min_trajectory_ssd = 1e9;
				
				$.each(recorded_trajectories, function(name, trajectory) {
					if(trajectory.length == groundtruth_trajectory.length) {
						var sum = 0.0;
						
						$.each(trajectory, function(idx, value) {
							var other = groundtruth_trajectory[idx];
							sum += Math.sqrt(Math.pow(value[0] - other[0], 2) + Math.pow(value[1] - other[1], 2));
						});
						
						min_trajectory_ssd = Math.min(min_trajectory_ssd, sum / trajectory.length);
					}
				});
				
				return { 'difference_to_groundtruth': min_trajectory_ssd }
			},
			'tries': 5,
		});
		
		var update_simulation_buttons = function(running) {
			// TODO: disable editor during simulation?! or set keyboard focus to canvas once simulation starts
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
				groundtruth_trajectory = groundtruth_trajectory.concat(trajectories['ardrone']);
				delete trajectories['ardrone'];
				
				$.each(trajectories, function(name, points) {
					recorded_trajectories[name] = (recorded_trajectories[name] || []).concat(points);
					
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
			submission_guard.reset();
			groundtruth_trajectory = [];
			recorded_trajectories = {};
			
			editor.getSession().setAnnotations([]);

			simulation.initialize();
			// TODO: set frequencies for callbacks, i.e., input 20Hz, pose update 60Hz, ...
			var success = simulation.run(code, function(time, data) {
				simulation_time = time;
				
				$.each(data, function(type, value) {
					if(plot_fcns[type] !== undefined) {
						plot_fcns[type](time, value);
					}
				});
			}, function() {
				update_simulation_buttons(false);
			}, function(error) {
				console.log(error);
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
				'duration': 135,
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
