//actually just concatenates the internal code with the user code.
//TODO: callback registering is the way to go
// AND: users may want to see the internal code.

define(['require', 'text!static/internal.py'], function(require) {
	var internal_code = require('text!static/internal.py');

	return function(user_code) {
		return user_code + '\n\n' + internal_code;
	};
});
