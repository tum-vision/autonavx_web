requirejs.config({
	paths: {
		'static': '../static/exercise7_visual_odometry/',
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
			deps: ['jquery'],
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

require(['require', 'domReady', 'jquery', 'eig22', 'init/editor', 'init/grapher', 'init/viewer', 'init/edx_state', 'init/submission_guard', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');
		var eig22 = require('eig22');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))
		var viewer = require('init/viewer')($('#viewport').get(0));

		var markers = [
			[1, 0.1, 0], [2, -0.15, 0], [3.5, 0.2, 0.1], [5, -0.05, -0.15], [7, 0.15, 0.45],
			[7-0.05, 1.3, 0.2], [7+0.1, 2.8, -0.8], [7-0.15, 4.5, -0.1], [7 + 0.05, 5.4, 1.3], [7, 6.9, -0.45],
			[5.5, 7 + 0.02, 0], [4.3, 7 +0.08, 0], [3.1, 7 - 0.1, 0.1], [2.0, 7 -0.05, -0.15], [0.5, 7.1, 0.45],
			[0.05, 5.4, 0.13], [0.1, 4.1, -0.08], [0.15, 2.9, -0.1], [0.05, 1.4, 1.3],
		];
		
        $.each(markers, function(idx, m) {
        	viewer.createMarker([m[0], m[1]], m[2], (idx + 1) * 100);
        });

		// TODO: replace with some better mvc code
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var augment_user_code = require('python/internal_code');
		var simulation = require('python/simulation_proxy')(vm);
		var submission_guard = require('init/submission_guard')($('#run-simulation-alert').get(0));

		var update_simulation_buttons = function(running) {
			// TODO: disable editor during simulation?! or set keyboard focus to canvas once simulation starts
			$('#run-simulation').prop('disabled', running);
			$('#stop-simulation').prop('disabled', !running);
			
			var d = 'disabled';
			if(running) {
				$('#simulation-options .btn').attr(d, d).addClass(d);
				$('#setpoint-options .btn').addClass(d);
			} else {
				$('#simulation-options .btn').removeClass(d).removeAttr(d);
				$('#setpoint-options .btn').removeClass(d).removeAttr(d);
			}
		};
		update_simulation_buttons(false);

		var setpoint_trajectory = [], quadrotor_trajectory = [], kalman_trajectory = [];
		
		var trajectory_ssd = function(des, real) {
			var i = 0, l = Math.min(des.length, real.length), sum = 0.0;
			
			for(i = 0; i < l; ++i) {
				var value = des[i], other = real[i];
				sum += Math.sqrt(Math.pow(value[0] - other[0], 2) + Math.pow(value[1] - other[1], 2));
			}
			
			return sum / l;
		};
		
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
				submission_guard.check(simulation_time > 80, 'You have to run the simulation for at least 80 seconds!');
				var min_trajectory_ssd = trajectory_ssd(quadrotor_trajectory, kalman_trajectory);
				
				return { 'trajectory_error': min_trajectory_ssd }
			},
			'tries': 5,
		});
		
		var last_render = 0, plot_count = 0;;
		
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
				if(trajectories['ardrone'] && trajectories['ardrone'].length > 0) {
					quadrotor_trajectory.push(trajectories['ardrone'][0]);
				}
				if(trajectories['kalman'] && trajectories['kalman'].length > 0) {
					kalman_trajectory.push(trajectories['kalman'][0]);
				}
				$.each(trajectories, function(name, points) {
					viewer.updateTrajectory(name, points);
				});
			},
			'points': function(time, point_data) {
   				$.each(point_data, function(name, points) {
       				viewer.updatePoints(name, points);
  				 });
			},
			'covariance2d': function(time, covariance) {
				if(covariance['kalman'] !== undefined) {
					if(covariance['kalman'].length > 0) {
						cov = covariance['kalman'][0];
						evd = eig22(cov);
						plot_count += 1;
						if(evd && (plot_count % 5) == 0) {
							evd.values[0] *= 3 * 4; 
							evd.values[1] *= 3 * 4;
							viewer.setCovariance2D(evd.vectors, evd.values);
						}
					}
				}
			},
		};

        var simulation_time = 0;

		$('#run-simulation').click(function() {
			simulation_time = 0;
			setpoint_trajectory = [];
			kalman_trajectory = [];
			quadrotor_trajectory = [];
			
			update_simulation_buttons(true);
			viewer.focus();
			
			var code = augment_user_code(editor.getSession().getValue());
			
			logview.empty();
			viewer.reset();
			submission_guard.reset();
			last_render = -1e5;
			editor.getSession().setAnnotations([]);

			simulation.initialize();
			
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
