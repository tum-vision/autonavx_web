define(["jquery", "Rickshaw"], function(jq, Rickshaw) {

	return function(elem, options) {
		options = options || {};
		var e = $(elem)
		
		var chart_element = e.children('#chart').get(0)
		var legend_element = e.children('#legend').get(0)
		var y_axis_element = e.children('#y_axis').get(0)
		
		var every_nth = options.subsampling || 8;
		var values_per_second = (options.values_per_second || 200) / every_nth;
		var show_seconds = options.seconds || 30;
		var max_items = values_per_second * show_seconds;
		
		var initial_data = [];
		var delta = 1 / values_per_second;
		
		for(var idx = 0; idx < max_items; ++idx) {
			initial_data.push({ x: 0 - (delta * (max_items - idx)), y: 0});
		}

		var palette = new Rickshaw.Color.Palette( { scheme: 'colorwheel' } );

		var series = new Rickshaw.Series([{
			'name': options.dummy_name || 'waiting for simulation...',
			'data': initial_data.slice(0)
		}], palette, {
			'timeBase': 0
		});

		var graph = new Rickshaw.Graph( {
			element: chart_element,
			width: e.innerWidth() - $(y_axis_element).width(),
			height: e.innerHeight(),
			min: 'auto',
			//max: +Math.PI,
			renderer: 'line',
			interpolation:'linear',
			'series': series
		} );

		var legend = new Rickshaw.Graph.Legend( {
			graph: graph,
			element: legend_element
		} );
		legend.render()
		var x_axis = new Rickshaw.Graph.Axis.X( {
			graph: graph,
			//ticks: show_seconds
		} );
		x_axis.render();

		var y_axis = new Rickshaw.Graph.Axis.Y( {
			graph: graph,
			orientation: 'left',
			//tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
			element: y_axis_element
		} );
		y_axis.render();
		
		var hoverDetail = new Rickshaw.Graph.HoverDetail( {
			graph: graph,
			xFormatter: function(x) { return x.toPrecision(3) + "s" },
		} );
		
		var toggle = new Rickshaw.Graph.Behavior.Series.Toggle({
			'graph': graph,
			'legend': legend
		});
		legend.shelving = toggle;
		
		graph.render();
		
		var first = true;
		var skip = 0;
		
		return {
			refreshGraph: function(timestamp, scalars) {
				if(first) {
					var variables = Object.keys(scalars);
					graph.series.length = 0;
					
					$.each(variables, function(idx, variable) {
						graph.series.addItem({ 'name': variable, 'data': initial_data.slice(0) })
					});
					 
					legend.render()
					first = false;
				}
				
				if((skip++ % every_nth) != 0) return;
				skip = 1;
				
				$.each(graph.series, function(idx, item) {
					if(item.data.length > max_items) {
						item.data.shift();
					}
					
					var v = 0;
					if(scalars[item.name]) {
						v = scalars[item.name][0];
						v = Math.abs(v) > 1e-10 ? v : 0;
					}
					
					item.data.push({x: timestamp, y: v });
				});
			},
			render: function() {
				graph.render();
			},
			reset: function() {
				first = true;
				graph.series.length = 0;
				graph.render();
			},
		};
	};
})
