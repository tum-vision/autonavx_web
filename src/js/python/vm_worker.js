define(['require', 'Skulpt', 'SkulptStdlib', 'mathjs'], function(require, Sk) {
	return function(log_callback) {
		Sk.interop['mathjs'] = require('mathjs');

		Sk.configure({
			output: function(str) {
				log_callback('python', str);
			},
			debugout: function(str) {
				log_callback('console', str);
			},
			read: function(module) {
				//log_callback('console', module);

				if(Sk.builtinFiles === undefined || Sk.builtinFiles["files"][module] === undefined)
					throw "File not found: '" + module + "'";

				return Sk.builtinFiles["files"][module];
			}
		});

		function toNativeArray(value) {
			if(!value || !value.v) {
				return [];
			}
			if(Object.prototype.toString.call(value.v) === '[object Array]') {
				var result = [];
				var idx;

				for(idx = 0; idx < value.v.length; ++idx) {
					result[idx] = toNativeArray(value.v[idx]);
				}

				return result;
			} else {
				return value.v;
			}
		};

		return {
			toNativeArray: toNativeArray,
		};
	};
})
