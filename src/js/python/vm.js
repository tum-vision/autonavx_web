define(['require', 'jquery', 'Skulpt', 'Skulpt/Stdlib', 'mathjs'], function(require, $, Sk) {
	// TODO: maybe replace log_element with a class, which provides a log function
	return function(log_element) {
		Sk.interop['mathjs'] = require('mathjs');

		var tagsToReplace = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

		function htmlEscape(str) {
			return str.replace(/[&<>]/g, function(tag) {
				return tagsToReplace[tag] || tag;
			});
		}
		
		var output_fun;
		
		if(log_element) {
			var e = $(log_element)
			output_fun = function(str) { e.append(htmlEscape(str)); e.scrollTop(e.prop('scrollHeight')); };
		} else {
			output_fun = function(str) { console.log(str); };
		}

		Sk.configure({
			output: output_fun,
			debugout: console.log,
			read: function(module) {
				if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][module] === undefined) {
					throw "File not found: '" + module + "'";
				}

				return Sk.builtinFiles["files"][module];
			}
		});

		function toNativeArray(value) {
			if($.isArray(value.v)) {
				return [$.map(value.v, toNativeArray)];
			} else {
				return [value.v];
			}
		};

		return {
			run: function(code) {
				var module = Sk.importMainWithBody("<stdin>", false, code);
				var func = module.tp$getattr("run");
				var start = new Date().getTime();

				var ret = Sk.misceval.callsim(func);

				var end = new Date().getTime();
				var time = end - start;
				console.log('Execution time: ' + (time * 0.001) + 's');
				//console.log(ret);
				return ret;
			},

			toNativeArray: function(v) {
				return toNativeArray(v)[0];
			},
		};
	};
})
