define(["ace/ace"], function(ace) {
	return function(element) {
		var editor = ace.edit(element);
		editor.setTheme("ace/theme/eclipse");
		editor.getSession().setMode("ace/mode/python");
		editor.getSession().setUseSoftTabs(true);
		editor.getSession().setTabSize(4);
		editor.setShowPrintMargin(false);

		return editor;
	};
})
