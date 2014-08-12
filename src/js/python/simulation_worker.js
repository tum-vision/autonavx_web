var global = self;

var messageQueue = []
var handleMessage = function(msg) {
	messageQueue.push(msg);
}

var startup = function() {
	importScripts('../require.js');

	// build base url
	var pathparts = global.location.pathname.split('/'), i;
	for(i = 0; i < pathparts.length; ++i) {
		if(pathparts[i] == 'js') break;
	}
	var baseurlparts = pathparts.slice(0, i + 1);
	baseurlparts.push('');
	baseurl = baseurlparts.join('/');

	requirejs.config({
		baseUrl: baseurl,
		paths: {
			'mathjs': 'math.min',
			'Skulpt': 'visnav_edx_skulpt.min',
			'SkulptStdlib': 'visnav_edx_skulpt-stdlib',
		},
		shim: {
			'Skulpt': {
				exports: 'Sk'
			},
			'SkulptStdlib': {
				deps: ['Skulpt'],
				exports: 'Sk.builtinFiles',
			},
		}
	});

	require(['require', 'python/vm_worker', 'python/simulation'], function(require) {
		// defines out-going-communication
		var protocol = {
			'log': function(origin, message) {
				postMessage({ 'type': 'log', 'origin': origin, 'message': message });
			},
			'simulationStart': function() {
				postMessage({ 'type': 'simulation_start' });
			},
			'simulationStep': function(time, data) {
				postMessage({ 'type': 'simulation_step', 'time': time, 'data': data });
			},
			'simulationError': function(error) {
				postMessage({ 'type': 'simulation_error', 'error': error });
			},
			'simulationStop': function() {
				postMessage({ 'type': 'simulation_stop' });
			}
		};

		// define replacement for console if it doesn't exist, e.g., in firefox
		if(global['console'] === undefined) {
			global['console'] = {
				'log': function(msg) {
					protocol.log('console', msg);
				}
			};
		}

		var vm = require('python/vm_worker')(protocol.log);
		var simulation = require('python/simulation')(vm);
		simulation.initialize();

		// overwrite handleMessage
		handleMessage = function(msg) {
			if(!msg.type) return;

			switch(msg.type) {
			case 'start_simulation':
				protocol.simulationStart();
				var success = simulation.run(msg.user_code, function(time, data) {
					protocol.simulationStep(time, data);
				}, function() {
					protocol.simulationStop();
				},
				function(error) {
					protocol.simulationError(error);
				}, msg.options);
				
				if(!success) {
					protocol.simulationStop();
				}
				break;
			case 'stop_simulation':
				simulation.stop();
				protocol.simulationStop();
				break;
			case 'set_simulation_input':
				simulation.setInput(msg.input);
				break;
			default:
				console.log(msg);
				break;
			}
		};

		// process handleMessageQueue
		var i;
		for (i = 0; i < messageQueue.length; i += 1) {
			handleMessage(messageQueue[i]);
		}
	});
	// replace startup with noop
	startup = function() {};
};

onmessage = function(e) {
	var msg = e.data;

	startup();
	handleMessage(msg);
};
