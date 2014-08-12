requirejs.config({
	paths: {
		'static': '../static/exercise2_numpy/',
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

require(['require', 'domReady', 'jquery', 'init/editor', 'python/vm', 'text!static/default.py'], function(require, domready) {
	domready(function() {
		$ = require('jquery');

		var editor = require('init/editor')($('#editor').get(0));
		editor.getSession().setValue(require('text!static/default.py'))

		var logview = $('#log-view');
		var vm = require('python/vm')(logview.get(0));

		$('#run').click(function() {
			var code = editor.getSession().getValue();
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
	})
});
