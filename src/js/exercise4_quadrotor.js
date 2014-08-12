requirejs.config({
	paths: {
		'static': '../static/exercise4_quadrotor/',
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
		'bootstrap/button': {
			deps: ['Skulpt'],
			exports: 'Sk.builtinFiles',
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

require(['require', 'domReady', 'jquery', 'bootstrap/button', 'init/editor', 'init/grapher', 'init/viewer', 'init/edx_state', 'init/submission_guard', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
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

		$('.btn').button()
		$('#setpoint-fix').closest('.btn').button('toggle')
		
		var get_simulation_config = function() {
			var setpoint = ($('#setpoint-fix').prop('checked') && 'fix') || ($('#setpoint-random').prop('checked') && 'random') || ($('#setpoint-circle').prop('checked') && 'circle');
			
			return {
				noise: $('#simulation-noise').prop('checked'), 
				delay: $('#simulation-delay').prop('checked'),
				setpoint: setpoint
			};
		};
		
		var setpoint_trajectory = [], quadrotor_trajectory = [];
		
		var trajectory_ssd = function(des, real) {
			var i = 0, l = Math.min(des.length, real.length), sum = 0.0;
			
			for(i = 0; i < l; ++i) {
				var value = des[i], other = real[i];
				sum += Math.sqrt(Math.pow(value[0] - other[0], 2) + Math.pow(value[1] - other[1], 2) + Math.pow(value[2] - other[2], 2));
			}
			
			return sum / l;
		};
		
		var find_min_trajectory_ssd = function(des, real_in) {
			// real is always behind des
			real = real_in.slice(0);
			
			var i = 0, n = 600, min_ssd = 1e9;
			
			for(i = 0; i < n; ++i) {
				real.splice(0,1);
				min_ssd = Math.min(min_ssd, trajectory_ssd(des, real));
			}
			
			return min_ssd;
		}
		
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
				submission_guard.check(simulation_time > 25, 'You have to run the simulation for at least 25 seconds!');
				submission_guard.check(cfg && cfg.noise && cfg.delay && cfg.setpoint == 'circle', 'You have to run the simulation with circle trajectory and noise and delay enabled!');
				
				var min_trajectory_ssd = find_min_trajectory_ssd(setpoint_trajectory, quadrotor_trajectory);
				
				submission_guard.check(min_trajectory_ssd < 0.2, 'Your trajectory error (=' + min_trajectory_ssd + ') is too large! It should be smaller than 0.2!')
				
				return { 'trajectory_error': min_trajectory_ssd }
			},
			'tries': 5,
		});
		
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
				if(trajectories['setpoint'] && trajectories['setpoint'].length > 0) {
					setpoint_trajectory.push(trajectories['setpoint'][0]);
				}
				if(trajectories['integrated'] && trajectories['integrated'].length > 0) {
					quadrotor_trajectory.push(trajectories['integrated'][0]);
				}
				$.each(trajectories, function(name, points) {
					viewer.updateTrajectory(name, points);
				});
			},
		};

        var cfg = undefined, simulation_time = 0;

		$('#run-simulation').click(function() {
			cfg = get_simulation_config();
			simulation_time = 0;
			setpoint_trajectory = [];
			quadrotor_trajectory = [];
			
			update_simulation_buttons(true);
			viewer.focus();

			var code = augment_user_code(editor.getSession().getValue());
			code += '\n    enable_noise = ' + (cfg.noise ? 'True' : 'False')
			code += '\n    enable_delay = ' + (cfg.delay ? 'True' : 'False')
			code += '\n    setpoint = "' + (cfg.setpoint) + '"'
			
			logview.empty();
			viewer.reset();
			grapher.reset();
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
				'duration': 30,
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
