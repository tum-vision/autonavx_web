define([], function() {
	function normalize(v) {
		var l = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
		return [v[0] / l, v[1] / l];
	}
	
	return function(mat) {
		if(mat.length != 2 || mat[0].length != 2) return false;
				
		var d = mat[0][0], e  = mat[0][1], f = mat[1][0], g = mat[1][1];
		
		// diagonal matrix
		if(Math.abs(e) < 1e-6 || Math.abs(f) < 1e-6) {
			return { values: [d, g], vectors: [[1,0], [0,1]] };
		}
		
		var tmp = Math.sqrt((4 * e * f) + Math.pow(d - g, 2));
		tmp = tmp > 0 ? tmp : 0;
		var eigval1 = 0.5 * (d + g + tmp);
		var eigval2 = 0.5 * (d + g - tmp);
				
		var eigvec1 = [1, -f / (g - eigval1)]
		var eigvec2 = [e / (d - eigval2), 1]
		
		return { values: [eigval1, eigval2], vectors: [normalize(eigvec1), normalize(eigvec2)] };
	};
})
