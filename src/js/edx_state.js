// excercise state loading and storage functions.
// need to be globally reachable without requirejs for edx
// this is just a buffer to be written by our script.

window.state_get_func = undefined;
window.grade_get_func = undefined;
window.exercise_state = undefined;

var Exercise = (function() {
	// returns relevant result for task grading
	function getGrade() {
		console.log("returning excercise result..");
		if (window.grade_get_func == undefined) {
			console.log("grade return function not defined yet.");
			throw "grade function undefined";
		}
		return JSON.stringify(window.grade_get_func());
	}

	// passes the current task state to the edx api for later restoring.
	// is called when the student clicks the check button.
	function getState() {
		console.log("edx saving state...");
		if (window.state_get_func == undefined) {
			console.log("entry state function not defined yet.");
			throw "state function undefined";
		}
		return JSON.stringify(window.state_get_func());
	}

	// saves task state for restoring
	function setState(state_str) {
		console.log("edx restoring state...");
		//console.log(state_str);
		// set global state variable:
		window.excercise_state = JSON.parse(state_str);
	}

	return {
		'getGrade': getGrade,
		'getState': getState,
		'setState': setState
	};
})();

// Establish a channel only if this application is embedded in an iframe.
// This will let the parent window communicate with this application using
// RPC and bypass SOP restrictions.
if (window.parent !== window) {
	var channel = Channel.build({
		window: window.parent,
		origin: "*",
		scope: "JSInput"
	});

	channel.bind("getGrade", function(channel_transaction) { return Exercise.getGrade() });
	channel.bind("getState", function(channel_transaction) { return Exercise.getState() });
	channel.bind("setState", function(channel_transaction, state) { return Exercise.setState(state) });
} else {
	window.Exercise = Exercise;
}
