define(['require', 'Skulpt'], function(require) {
	var Sk = require('Skulpt');
	var simulator;
	return function(vm) {
		var worker, step_cb, done_cb, error_cb;

		var cleanup = function() {
			if(done_cb) {
				done_cb();
			}
			step_cb = done_cb = error_cb = undefined;
		};

		return {
			initialize: function() {
				if (worker) {
					return;
				}

				worker = new Worker(require.toUrl('./simulation_worker.js'));
				worker.onmessage = function(e) {
					var msg = e.data;

					switch (msg.type) {
					case 'log':
						switch (msg.origin) {
						case 'python':
							Sk.output(msg.message);
							break;
						case 'console':
							console.log(msg.message);
							break;
						}
						break;
					case 'simulation_step':
						if(step_cb) {
							step_cb(msg.time, msg.data);
						}
						break;
					case 'simulation_error':
						if(error_cb) {
							error_cb(msg.error);
						}
						break;
					case 'simulation_stop':
						cleanup();
						break;
					default:
						console.log(msg);
						break;
					}
				};

				worker.onerror = function(e) {
					console.log('Worker error: ', e);
				};
			},

			run: function(user_callback_code, step_callback, done_callback, error_callback, options) {
				if(!worker) {
					console.log("You have to call initialize()!");
					return false;
				}
				step_cb = step_callback;
				done_cb = done_callback;
				error_cb = error_callback;
				worker.postMessage({ 'type': 'start_simulation', 'user_code': user_callback_code, 'options': options});

				return true;
			},

			stop: function() {
				worker.postMessage({ 'type': 'stop_simulation'});
			},

			setInput: function(input) {
				worker.postMessage({ 'type': 'set_simulation_input', 'input': input});
			}
		};
	};
});
