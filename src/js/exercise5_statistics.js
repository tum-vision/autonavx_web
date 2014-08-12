requirejs.config({
	paths: {
		'static': '../static/exercise5_statistics/',
		'mathjs': 'math.min',
		'jquery': 'jquery.min',
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
	}
});

require(['require', 'domReady', 'jquery', 'init/edx_state', 'init/editor', 'python/vm', 'python/internal_code', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))

		var augment_user_code = require('python/internal_code')

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
				return { 'success': run() }
			},
			'tries': 5,
		});

		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));
		
		function run() {
			var code = augment_user_code(editor.getSession().getValue());
			logview.empty();
			
			try {
				editor.getSession().setAnnotations([]);

				return vm.run(code).v;
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
			
			return false;
		};
		$('#run').click(function() { 
			run(); 
		});
	})
});
