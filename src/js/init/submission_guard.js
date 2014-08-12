define(["jquery"], function($) {
	
	return function(element) {
		var e = $(element);
		
		return {
			'check': function(check, message) {
				if(!check) {
					e.text(message)
					e.removeClass('hide');
					
					throw message;
				}
			},
			'reset': function() {
				e.addClass('hide');
			}
		};
	};
});
