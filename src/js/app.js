/*
main javascript code for the excercise.

edx problem specification to specify expected result:

<problem display_name="epic excercise">
	<customresponse cfn="verification_function">
		<jsinput
			gradefn="Exercise.getGrade"
			get_statefn="Exercise.getState"
			set_statefn="Exercise.setState"
			width="100%" height="850"
			sop="true"
			html_file="/static/exercise_NUMBER.html"
		/>
	</customresponse>
	<script type="loncapa/python">
	import json
	import sys
	def verification_function(e, data_raw):
		# data_raw is a json string that contains
		# two members referencing further json strings.
		data = json.loads(data_raw)

		# dict, containing the result of getGrade
		answer = json.loads(data["answer"])

		# dict, containing the stored state by getState
		state  = json.loads(data["state"])

		# use either of them to verify the user input.

		result = answer["beacons_passed"] >= 4
		return result
	</script>
</problem>
*/


requirejs.config({
	paths: {
		'static': '../static/test',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'jquery': 'jquery.min',
		'THREE/TrackballControls': 'three/TrackballControls',
		'THREE/ColladaLoader': 'three/ColladaLoader',
		'Skulpt': 'autonavx_skulpt',
		'Skulpt/Stdlib': 'autonavx_skulpt-stdlib',
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

require(['require', 'domReady', 'jquery', 'init/editor', 'init/grapher', 'init/viewer', 'init/keybindings', 'init/edx_state', 'python/vm', 'python/simulation_proxy', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		console.log("DOM is ready, initializing visnav code...");

		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		var grapher = require('init/grapher')($('#grapher').get(0));
		var viewer = require('init/viewer')($('#viewport').get(0));

		// set the default code in the editor
		editor.getSession().setValue(require('text!static/default.py'))

		// wrapper for the user code
		var augment_user_code = require('python/internal_code');

		// excercise state variables
		// used for evaluation results
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
				return { 'beacons_active_count': beacons_active_count }
			},
		});

		// TODO: replace with some better mvc code
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var simulation = require('python/simulation_proxy')(vm);
		console.log(simulation);

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

		$('#run').click(function() {
			var code = augment_user_code(editor.getSession().getValue());
			logview.empty();

			try {
				editor.getSession().setAnnotations([]);

				var result = vm.run(code);
				console.log(result);
				if(result !== undefined) {
					console.log(vm.toNativeArray(result));
				}
			} catch(e) {
				if(e.args) {
					editor.getSession().setAnnotations([{
						text: vm.toNativeArray(e.args)[0],
						type: 'error',
						row: e.lineno - 1,
					}]);
				} else {
					console.log('Non-Python exception thrown from call to python function!');
					console.log(e)
					editor.getSession().setAnnotations([{
						text: e.message,
						type: 'error',
						row: 0,
					}]);
				}
			}
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

				if (poses['ardrone'] !== undefined) {
					viewer.setDronePose(poses['ardrone'][0]);
				}
			},
			'motor_command': function(time, commands) {
				if (commands['ardrone'] !== undefined) {
					viewer.setDroneMotorCommands(commands['ardrone'][0]);
				}
			},
			'trajectory': function(time, trajectories) {
				$.each(trajectories, function(name, points) {
					viewer.updateTrajectory(name, points);
				});
			},
			'points': function(time, point_data) {
				$.each(point_data, function(name, points) {
					viewer.updatePoints(name, points);
				});
			},
		};

		var beacons = [];
		beacons.push(viewer.createBeacon([2, 0, 0]));
		beacons.push(viewer.createBeacon([4, 0, 0]));
		beacons.push(viewer.createBeacon([6, 0, 0]));

		$('#run-simulation').click(function() {
			update_simulation_buttons(true);
			viewer.focus();

			var code = editor.getSession().getValue();

			logview.empty();
			viewer.reset();
			grapher.reset();
			$.each(beacons, function(idx, beacon) {
				beacon.setInactive();
				beacons_active_count = 0
			});

			var simulation_step_count = 0;
			editor.getSession().setAnnotations([]);

			simulation.initialize();
			// TODO: set frequencies for callbacks, i.e., input 20Hz, pose update 60Hz, ...
			var success = simulation.run(code, function(time, data) {
				simulation.setInput(simulation_input);
				simulation_step_count += 1;

				if(simulation_step_count % 2 != 0) return;
				simulation_step_count = 0;
				$.each(data, function(type, value) {
					if(plot_fcns[type] !== undefined) {
						plot_fcns[type](time, value);
					}
				});

				$.each(beacons, function(idx, beacon) {
					if(beacon.distanceToDrone() < 0.5) {
						beacon.setActive();
						beacons_active_count += 1
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
