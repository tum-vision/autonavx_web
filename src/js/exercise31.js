requirejs.config({
	paths: {
		'static': '../static/exercise2/',
		'mathjs': 'math.min',
		'THREE': 'three.min',
		'jquery': 'jquery.min',
		'THREE/TrackballControls': 'three/TrackballControls',
		'THREE/ColladaLoader': 'three/ColladaLoader',
		'Skulpt': 'visnav_edx_skulpt.min',
		'Skulpt/Stdlib': 'visnav_edx_skulpt-stdlib',
	},
	shim: {
		'Skulpt': {
			exports: 'Sk'
		},
		'Skulpt/Stdlib': {
			deps: ['Skulpt'],
			exports: 'Sk.builtinFiles',
		},
		'THREE': {
			exports: 'THREE'
		},
		'THREE/TrackballControls': {
			deps: ['THREE'],
			exports: 'THREE.TrackballControls'
		},
		'THREE/ColladaLoader': {
			deps: ['THREE'],
			exports: 'THREE.ColladaLoader'
		},
	}
});

require(['require', 'domReady', 'jquery', 'init/rot_viewer'], function(require, domready) {
	domready(function() {
		$ = require('jquery');
		viewer = require('init/rot_viewer')($('#viewport').get(0));		
	
	$('#run').click(function() {
	
		
		// function name and parameters to pass
		var fnstring = ($('#input').get(0)).value;
		var matches = fnstring.match(/\((.*?)\)/);
		var fnparams = matches[1].split(",").map(Number);
		var fnstring =fnstring.match(/[^(]*/)[0];
		// find object
		var fn = viewer[fnstring]; 
		// is object a function?
		if (typeof fn === "function") fn.apply(null, fnparams);
	});
	
	})
});
