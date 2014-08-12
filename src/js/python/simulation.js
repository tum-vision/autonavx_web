define(['require', 'Skulpt'], function(require) {
	var Sk = require('Skulpt');
	var simulator;

	var toPyFloat = function(v) {
		return Sk.builtin.nmber(v, Sk.builtin.nmber.float$)
	}

	return function(vm) {
		var run_simulation = false;
		return {
			initialize: function() {
				// only initialize once
				if (simulator) return;

				var simulator_module       = Sk.importModule('simulator.setup');
				var simulator_setup_module = simulator_module.tp$getattr('setup');
				var simulator_setup_setup  = simulator_setup_module.tp$getattr('setup');
				var sim                    = Sk.misceval.callsim(simulator_setup_setup);

				var sim_reset              = sim.tp$getattr('reset');
				var sim_simulation_step    = sim.tp$getattr('simulate_step');
				var sim_get_drone_pose     = sim.tp$getattr('get_drone_pose');
				var sim_get_drone_navdata  = sim.tp$getattr('get_drone_navdata');
				var sim_set_input          = sim.tp$getattr('set_input');

				// proxy for python simulator object
				simulator = {
					get_python_object: function() {
						return sim;
					},
					get_drone_navdata: function() {
						return Sk.misceval.callsim(sim_get_drone_navdata);
					},
					simulation_step: function(t, dt) {
						Sk.misceval.callsim(sim_simulation_step, t, dt);
					},
					set_input: function(input) {
						var input_list = Sk.builtin.list([toPyFloat(input.vx), toPyFloat(input.vy), toPyFloat(input.vyaw), toPyFloat(input.vz)]);
						Sk.misceval.callsim(sim_set_input, input_list);
					},
					reset: function() {
						Sk.misceval.callsim(sim_reset);
					}
				};
			},

			run: function(user_callback_code, step_callback, done_callback, error_callback, options) {
				if (!simulator) {
					console.log("You have to call initialize() before run()!");
					return false;
				}

				var handle_exception = function(e) {
					if(e.args) {
						var message = vm.toNativeArray(e.args)[0];
						var filename = e.filename;
						console.log(message)
						
						error_callback({ 'filename': '<stdin>.py', 'lineno': e.lineno, 'message': message });
					} else {
						console.log('Non-Python exception thrown from call to python function!');
						error_callback({ 'filename': '<stdin>.py', 'lineno': 1, 'message': e.message });
					}
					run_simulation = false;
				}

				simulator.reset();
				
				if(Sk.interop['plot'] !== undefined) {
					Sk.interop.plot.reset();
				}

				var user_code_class = undefined, user_code_object = undefined, measurement_callback_method = undefined;

				if(user_callback_code) {
					var module = undefined;

					try {
						module = Sk.importMainWithBody("<stdin>", false, user_callback_code);
					} catch(e) {
						handle_exception(e);
						return false;
					}

					user_code_class = module.tp$getattr('InternalCode');

					if(!user_code_class) {
						error_callback({ 'filename': '<stdin>.py', 'lineno': 1, 'message': 'No InternalCode class defined!' });
						return false;
					}

					// call user constructor
					try {
						user_code_object = Sk.misceval.callsim(user_code_class, simulator.get_python_object());
					} catch(e) {
						handle_exception(e);
						return false;
					}

					measurement_callback_method = user_code_object.tp$getattr('measurement_callback');

					if(!measurement_callback_method) {
						error_callback({ 'filename': '<stdin>.py', 'lineno': 1, 'message': 'The InternalCode class has to define a measurement_callback method!' });
						return false;
					}

					if(measurement_callback_method.im_func.func_code.length != 4) {
						error_callback({ 'filename': '<stdin>.py', 'lineno': 1, 'message': 'The method measurement_callback should expect exactly 4 arguments!' });
						return false;
					}
				}

				// set defaults
				if (options['async'] === undefined) {
					options.async = true;
				}

				if (options['duration'] === undefined) {
					options.duration = 30;
				}

				//simulation time properties
				var t = 0.0;
				var t_end = options.duration;
				var dt = 0.005;

				var real_t_start = new Date().getTime();
				run_simulation = true;

				var simulation_step = function() {
					simulator.simulation_step(t, dt);

					if(measurement_callback_method) {
						var navdata = simulator.get_drone_navdata();
						try {
							Sk.misceval.callsim(measurement_callback_method, toPyFloat(t), toPyFloat(dt), navdata);
						} catch(e) {
							handle_exception(e);
						}
					}

					step_callback(t, Sk.interop.plot.data);
					Sk.interop.plot.clear();

					t += dt;
				};

				var done = function() {
					var real_t_end = new Date().getTime();
					var real_t  = (real_t_end - real_t_start) * 0.001;
					var real_t_per_step = real_t / (t / dt);
					Sk.output('done ' + real_t + 's ' + real_t_per_step + 's/step');
					run_simulation = false;

					done_callback();
				};

				if (!options.async) {
					console.log('running blocking simulation');
					while (run_simulation && t < t_end) {
						simulation_step();
					}

					done();
				} else {
					console.log('running non-blocking simulation');
					var simulation_step_async = function() {
						if (run_simulation && t < t_end) {
							setTimeout(simulation_step_async, 0);
							simulation_step();
						} else {
							done();
						}
						// TODO: implement realtime == simulation time for interactive mode

						// NOTE: not necessary right now if next simulation_step_async is scheduled before calling simulation_step
						// run a couple of steps synchronously so we can be faster than realtime
						/**
						var sync_step = 0;

						while(sync_step < 8 && t < t_end) {
							simulation_step();
							sync_step += 1;
						}
						*/
					};

					simulation_step_async();
				}

				return true;
			},

			stop: function() {
				run_simulation = false;
			},

			setInput: function(input) {
				simulator.set_input(input);
			}
		};
	};
});
