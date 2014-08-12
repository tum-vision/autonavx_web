requirejs.config({
	paths: {
		'static': '../static/exercise4_linear/',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'jquery': 'jquery.min',
		'THREE/TrackballControls': 'three/TrackballControls',
		'THREE/ColladaLoader': 'three/ColladaLoader',
		'Skulpt': 'autonavx_skulpt.min',
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
		'bootstrap/button': {
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

require(['require', 'domReady', 'jquery', 'bootstrap/button', 'Skulpt', 'init/edx_state', 'init/submission_guard', 'init/editor', 'init/grapher', 'python/vm', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');
		Sk = require('Skulpt');
		
		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))
		var grapher = require('init/grapher')($('#grapher').get(0), {
			'values_per_second': 100,
			'subsampling': 4,
			'seconds': 30,
			'dummy_name': 'click run...'
		});
		
		// TODO: replace with some better mvc code
		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		var augment_user_code = require('python/internal_code');
		var submission_guard = require('init/submission_guard')($('#run-simulation-alert').get(0));
		
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
			    var result = run();
			    var c1 = result.length >= 2 && result[0] < 10.0;
			    var c2 = result.length >= 2 && result[1] < 0.5;
			
			    submission_guard.check(c1, 'Your controller needs too much time (' + result[0].toFixed(3) + 's) to stabilize the system! Maybe you have to tune your gains.')
			    submission_guard.check(c2, 'Your controller creates too much overshoot (' + result[1].toFixed(3) + ')! Maybe you have to tune your gains.')
			
				return { 'success': c1 && c2 }
			},
			'tries': 5,
		});

		$('.btn').button()
		
		//var get_simulation_config = function() {
		//	return {
		//		noise: $('#simulation-noise').prop('checked'), 
		//		delay: $('#simulation-delay').prop('checked')
		//	}
	    //}
		
		var cfg = undefined;
		
		function run() {
			//cfg = get_simulation_config();
			var result = [30.0, 100.0];
			var code = augment_user_code(editor.getSession().getValue());
			//code += '\nenable_noise = ' + (cfg.noise ? 'True' : 'False')
			//code += '\nenable_delay = ' + (cfg.delay ? 'True' : 'False')
			logview.empty();
			submission_guard.reset();
			try {
				editor.getSession().setAnnotations([]);
				
				result = vm.toNativeArray(vm.run(code));
				
				grapher.reset();
				if(Sk.interop.plot && Sk.interop.plot.data.scalar) {
					var grapher_input = [];
					$.each(Sk.interop.plot.data.scalar, function(name, values) {
						$.each(values, function(idx, value) {
							grapher_input[idx] = grapher_input[idx] || {};
							grapher_input[idx][name] = [value];
						});
					});
					
					$.each(grapher_input, function(idx, input) {
						grapher.refreshGraph(idx * 0.01, input);
					});
					grapher.render();
					Sk.interop.plot.clear();
				}
			} catch(e) {
				console.log(e)
				if(e.args) {
					editor.getSession().setAnnotations([{
						text: vm.toNativeArray(e.args)[0],
						type: 'error',
						row: e.lineno != '<unknown>' ? e.lineno - 1 : 0,
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
			
			return result;
		};
		$('#run').click(function() { 
			console.log(run()); 
		});
	})
});
