define([], function() {
	return function(options) {
		if(options['get_state']) {
			// when edx requests the current excercise state,
			// this function is executed.
			// the initial definition of this variable is in the excercise html header.
			window.state_get_func = function() {
				console.log("excercise state requested");
				return options.get_state();
			};
		}

		if(options['set_state']) {
			// this function restores the excercise state with the
			// data format exported by state_get_func.
			window.state_restore_func = function(data) {
				 options.set_state(data);
			};
		}
	
		if(options['get_grade']) {
			// return the json object used by the serverside python grading function
			// initial definition also in the excercise html header.
			window.grade_get_func = function() {
				console.log("returning evaluation");
				return options.get_grade();
			};
		}
		
		// as the setState call from edx happens at an undefined time,
		// try to restore the state multiple times.
		// https://github.com/edx/edx-platform/blob/master/common/static/js/capa/src/jsinput.js#L150
		var attempt_state_restore = function(tries) {
			if (tries > 0) {
				//try to read the restorable state from the global state variable
				if (window.excercise_state == undefined) {
					//next restore try
					setTimeout(function() {attempt_state_restore(tries - 1);}, 200);
				} else {
					//yaay, the state was set.
					window.state_restore_func(window.excercise_state);
				}
			} else {
				console.log("Did not restore excercise state.");
			}
		};
	
		attempt_state_restore(options['tries']);
	};
});
