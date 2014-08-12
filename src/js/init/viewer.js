define(["jquery", "THREE", "THREE/TrackballControls", "THREE/ColladaLoader"], function($, THREE, TrackballControls, ColladaLoader) {
	var key_alias = {
		'left': 37,
		'up': 38,
		'right': 39,
		'down': 40,
		'space': 32,
		'pageup': 33,
		'pagedown': 34,
		'tab': 9,
		'escape': 27
	};

	var toKeyCode = function(alias) {
		if(key_alias[alias] !== undefined) {
			return key_alias[alias];
		} else {
			return alias.toUpperCase().charCodeAt(0);
		}
	}
	
	var color_presets1 = [
		"#DC6890",
		"#6ACF49",
		"#6BB5C8",
		"#BAA140",
		"#C961D9",
		"#EB4B40",
		"#6DC086",
		"#9F8FCE",
		"#D27C47",
		"#C8D84E"
	];
	var color_presets = [
		"#3995e6",
		"#e5397e",
		"#33adcc",
		"#e59900",
		"#40ffbf",
		"#0000cc",
		"#f20020",
		"#ccbe00",
		"#ac39e6",
		"#85f23d",
	];
	
	var color_idx = 0;
	var material = function() {
		var result;
		if(color_idx > color_presets.length) {
			result = new THREE.MeshBasicMaterial();
		} else {
			result = new THREE.MeshBasicMaterial({ color: color_presets[color_idx] });
			color_idx += 1;
		}
		
		return result;
	};

	return function(element) {
		var has_webgl = ( function () { try { var canvas = document.createElement( 'canvas' ); return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ); } catch( e ) { return false; } } )();

		e = $(element);
		var overlay = $("#overlay"), new_overlay_text = has_webgl ? "" : "No WebGL found using slow fallback!";
		var scene = new THREE.Scene();

		// setup camera
		var camera = new THREE.PerspectiveCamera(50, e.innerWidth() / e.innerHeight(), 100, 20000);
		camera.position.z = 1500;
		camera.position.x = -2000;
		//camera.lookAt(new THREE.Vector3(0, 0, 0))
		camera.up = new THREE.Vector3(1, 0, 0)

		// setup camera mouse control
		var controls = new TrackballControls(camera, element);
		controls.rotateSpeed = 1.0;
		controls.zoomSpeed = 3.2;
		controls.panSpeed = 0.8;
		controls.noZoom = false;
		controls.noPan = false;
		controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.3;
		controls.keys = [ 65, 83, 68 ];
		controls.addEventListener('change', render);

		var renderer = has_webgl ? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
		renderer.setSize(e.innerWidth(), e.innerHeight());
		renderer.setClearColor(0xeeeeee, 1);

		e.append(renderer.domElement);
		renderer.domElement.tabIndex = 0;
		renderer.domElement.addEventListener("mousedown", function(e) {
			renderer.domElement.focus();
		});

		var keydown_handlers = {}, keyup_handlers = {};

		renderer.domElement.addEventListener("keydown", function(e) {
			e.stopPropagation();
			e.preventDefault();

			if (keydown_handlers[e.keyCode] !== undefined) {
				keydown_handlers[e.keyCode]();
			}

			return false;
		});

		renderer.domElement.addEventListener("keyup", function(e) {
			e.stopPropagation();
			e.preventDefault();

			if (keyup_handlers[e.keyCode] !== undefined) {
				keyup_handlers[e.keyCode]();
			}

			return false;
		});

		function render() {
			renderer.render(scene, camera);
			overlay.text(new_overlay_text);
		}

		function animate(t) {
			//render frames at 60 Hz
			setTimeout(function() {
				//ask browser to call 'animate' for next render iteration
				requestAnimationFrame(animate);
			}, 1000 / 60 );

			controls.update();
			render();
		}

		function createAxis() {
			var axis = new THREE.AxisHelper(300)
			axis.material.linewidth = 2;

			return axis;
		}

		var loader = new ColladaLoader();
		var grid = new THREE.GridHelper(has_webgl ? 20000 : 5000, 250);
		grid.rotation.set(Math.PI/2, 0, 0 );
		scene.add(grid);

		var world_coords = createAxis();
		world_coords.position.z += 5;
		scene.add(world_coords)
			
		var marker_texture = THREE.ImageUtils.loadTexture('assets/markers.png');
		marker_textureflipY = true;
		marker_texture.magFilter = THREE.NearestFilter
		marker_texture.minFilter = THREE.NearestFilter
		var marker_material = new THREE.MeshBasicMaterial({ map: marker_texture, side: THREE.DoubleSide });
		
		var markers = {};
		
		var createMarker = function(position, yaw, id) {
			if(markers[id] === undefined) {
				var marker_geometry = new THREE.PlaneGeometry(200, 200);
				var w = 773, h = 775;
	
				var marker_x = id % 64;
				var marker_y = Math.floor(id / 64);
	
				var x0 = 4.0 + marker_x * 12;
				var x1 = x0 + 8.0;
				var y0 = 7.0 + marker_y * 12;
				var y1 = y0 + 8.0;
	
				// triangle 1
				marker_geometry.faceVertexUvs[0][0][0].x = x0 / w;
				marker_geometry.faceVertexUvs[0][0][0].y = y1 / h;
				marker_geometry.faceVertexUvs[0][0][1].x = x0 / w;
				marker_geometry.faceVertexUvs[0][0][1].y = y0 / h;
				marker_geometry.faceVertexUvs[0][0][2].x = x1 / w;
				marker_geometry.faceVertexUvs[0][0][2].y = y1 / h;
	
				// triangle 2
				marker_geometry.faceVertexUvs[0][1][0].x = x0 / w;
				marker_geometry.faceVertexUvs[0][1][0].y = y0 / h;
				marker_geometry.faceVertexUvs[0][1][1].x = x1 / w;
				marker_geometry.faceVertexUvs[0][1][1].y = y0 / h;
				marker_geometry.faceVertexUvs[0][1][2].x = x1 / w;
				marker_geometry.faceVertexUvs[0][1][2].y = y1 / h;
				marker_geometry.uvsNeedUpdate = true;
				markers[id] = new THREE.Mesh(marker_geometry, marker_material);
				
				scene.add(markers[id]);
			}
			
			var marker = markers[id];
			marker.rotation.z = yaw;
			
			marker.position.x = position[0] * 500;
			marker.position.y = position[1] * 500;
			marker.position.z = 5
		};
		
		//setup scene lights
		scene.add(new THREE.AmbientLight(0x333333));

		var directional_light_0 = new THREE.DirectionalLight(0xaaaaaa);
		directional_light_0.position.x = 500;
		directional_light_0.position.y = 200;
		directional_light_0.position.z = 500;
		directional_light_0.position.normalize();
		scene.add(directional_light_0);

		var directional_light_1 = new THREE.DirectionalLight(0xaaaaaa);
		directional_light_1.position.x = -500;
		directional_light_1.position.y = -200;
		directional_light_1.position.z = 500;
		directional_light_1.position.normalize();
		scene.add(directional_light_1);

		var beacons = {}
		var inactive_beacon_material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
		var inactive_beacon_outline_material = new THREE.MeshBasicMaterial({ wireframe: true, wireframeLinewidth: 2, color: 0xaa0000 });
		var active_beacon_material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
		var active_beacon_outline_material = new THREE.MeshBasicMaterial({ wireframe: true, wireframeLinewidth: 2, color: 0x00aa00 });

		var createBeacon = function(position) {
			var beacon = new THREE.Mesh(new THREE.OctahedronGeometry(80), inactive_beacon_material);
			var active = false;
			//beacon.rotation.z = Math.PI / 4
			beacon.scale.z = 1.5
			beacon.position.set(position[0] * 500, position[1] * 500, position[2] * 500);

			var beacon_outline = new THREE.Mesh(new THREE.OctahedronGeometry(82), inactive_beacon_outline_material);
			beacon.add(beacon_outline);

			scene.add(beacon);

			return {
				mesh: beacon,

				distanceToDrone: function() {
					if(drone) {
						return beacon.position.distanceTo(drone.position) / 500.0;
					} else {
						return Infinity;
					}
				},
				setActive: function() {
					active = true;
					beacon.material = active_beacon_material;
					beacon_outline.material = active_beacon_outline_material;
				},
				setInactive: function() {
					active = false;
					beacon.material = inactive_beacon_material;
					beacon_outline.material = inactive_beacon_outline_material;
				},
				isActive: function() {
					return active;
				}
			};
		};

		var trajectories = {};
		var createTrajectory = function(plot_type) {
			var point_size = 50;
			var line_segment_count = 1000;
			var trajectory = {};

			console.log('creating trajectory with ' + line_segment_count + ' segments in mode ' + plot_type + '...')

			trajectory.plot_type = plot_type;

			trajectory.geometry = new THREE.Geometry();
			for (var i = 0; i < line_segment_count * 2; ++i) {
				trajectory.geometry.vertices.push(new THREE.Vector3(1e9, 1e9, 1e9));
			}

			trajectory.mesh = new THREE.Line(trajectory.geometry, material(), THREE.LinePieces);
			trajectory.mesh.dynamic = true;
			trajectory.mesh.material.linewidth = 2;

			trajectory.reset = function() {
				trajectory.latest_vertex_index = 1;

				for (var i = 0; i < trajectory.geometry.vertices.length; ++i) {
					trajectory.geometry.vertices[i].x = 0;
					trajectory.geometry.vertices[i].y = 0;
					trajectory.geometry.vertices[i].z = 0;
				}
				trajectory.geometry.verticesNeedUpdate = true;
			};

			trajectory.show = function() {
				scene.add(trajectory.mesh);
			}

			trajectory.hide = function() {
				scene.remove(trajectory.mesh);
			}

			trajectory.addPoint = function(x, y, z) {
				//TODO: fix scale..
				x *= 500;
				y *= 500;
				z = isFinite(z) ? z * 500 : drone.position.z; // infinite if 2D trajectory plot

				var waypoint_old = trajectory.geometry.vertices[trajectory.latest_vertex_index];
				var dist = Math.sqrt(Math.pow(waypoint_old.x - x, 2) + Math.pow(waypoint_old.y - y, 2) + Math.pow(waypoint_old.z - z, 2));

				//when drawing "points", we actually draw a line segment
				//with the length of 'point_size' subtracted from the z coordinate
				if (trajectory.plot_type == "points") {
					waypoint_old = {
						x: x,
						y: y,
						z: z - point_size,
					};
				}

				//compute the distance between the two plot points

				//minimum distance between waypoints
				if (dist < (0.05 * 500.0)) return;

				//when we have filled up the buffer completely, overwrite the oldest values first.
				var next_index_0 = (trajectory.latest_vertex_index + 1) % trajectory.geometry.vertices.length;
				var next_index_1 = (trajectory.latest_vertex_index + 2) % trajectory.geometry.vertices.length;

				trajectory.geometry.vertices[next_index_0].x = waypoint_old.x;
				trajectory.geometry.vertices[next_index_0].y = waypoint_old.y;
				trajectory.geometry.vertices[next_index_0].z = waypoint_old.z;

				trajectory.geometry.vertices[next_index_1].x = x;
				trajectory.geometry.vertices[next_index_1].y = y;
				trajectory.geometry.vertices[next_index_1].z = z;

				trajectory.geometry.verticesNeedUpdate = true;

				trajectory.latest_vertex_index = next_index_1
			}

			trajectory.addPoints = function(points) {
				for(var i = 0; i < points.length; ++i) {
					trajectory.addPoint(points[i][0], points[i][1], points[i][2]);
				}
			}

			trajectory.reset();
			trajectory.show();

			return trajectory;
		};

		animate();

		var covariance2d = new THREE.Mesh(new THREE.RingGeometry(480, 520, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
		covariance2d.visible = false;
		scene.add(covariance2d);
		
		var drone = undefined;
		var drone_motors = [];
		loader.load('assets/ardrone2.dae', function(result) {
			console.log("loaded drone model");
			drone = new THREE.Object3D();
			drone.add(createAxis())
			drone.rotation.order = 'ZYX';
			var model = result.scene;
			model.rotation.z = -Math.PI * 0.5;

			//drone.add(covariance2d);
			if(has_webgl) {
				drone.add(model);
			}
			
			scene.add(drone);
			var dir = new THREE.Vector3( 0, 0, 1 ), length = 150, hex = 0xff0000, headLength = 20, headWidth = 20, s = 2.5;
			drone_motors[0] = new THREE.ArrowHelper( dir, new THREE.Vector3( 27 * s,  42 * s, 0), length, hex, headLength, headWidth);
			drone_motors[1] = new THREE.ArrowHelper( dir, new THREE.Vector3(-27 * s,  42 * s, 0), length, hex, headLength, headWidth);
			drone_motors[2] = new THREE.ArrowHelper( dir, new THREE.Vector3(-26 * s, -40 * s, 0), length, hex, headLength, headWidth);
			drone_motors[3] = new THREE.ArrowHelper( dir, new THREE.Vector3( 26 * s, -40 * s, 0), length, hex, headLength, headWidth);

			$.each(drone_motors, function(idx, motor) {
				motor.line.material.linewidth = 2;
				drone.add(motor);
			});
		});

		return {
			focus: function() {
				renderer.domElement.focus();
			},

			setKeydownHandler: function(key, h) {
				keydown_handlers[toKeyCode(key)] = h;
			},

			setKeyupHandler: function(key, h) {
				keyup_handlers[toKeyCode(key)] = h;
			},

			setDronePose: function(pose) {
				if(!drone) return;
				// TODO: fix scale
				drone.position.x = pose[0] * 500;
				drone.position.y = pose[1] * 500;
				drone.position.z = pose[2] * 500;

				drone.rotation.x = pose[3];
				drone.rotation.y = pose[4];
				drone.rotation.z = pose[5];
			},

			setDroneMotorCommands: function(commands) {
				if(!drone) return;

				var avg = 1.4664606164383562;

				drone_motors[2].scale.y = 1.0 + (commands[0] - avg) * 10;
				drone_motors[3].scale.y = 1.0 + (commands[1] - avg) * 10;
				drone_motors[0].scale.y = 1.0 + (commands[2] - avg) * 10;
				drone_motors[1].scale.y = 1.0 + (commands[3] - avg) * 10;
			},

			setCovariance2D: function(rotation, scale) {
				covariance2d.visible = true;

                covariance2d.position = drone.position
				//covariance2d.rotation.setFromRotationMatrix(new THREE.Matrix4(
				//	rotation[0][0], rotation[0][1], 0, 0,
				//	rotation[1][0], rotation[1][1], 0, 0,
				//	0, 0, 1, 0,
				//	0, 0, 0, 1
				//));
				//console.log(scale)
				covariance2d.scale.set(Math.abs(scale[0]), Math.abs(scale[1]), 1);
			},

			setOverlayText: function(text) {
				new_overlay_text = text;
			},

			createBeacon: function(position) {
				return createBeacon(position);
			},
			
			createMarker: createMarker,

			updateTrajectory: function(name, points) {
				if(trajectories[name] === undefined) {
					console.log("creating new line plot '" + name + "'")
					trajectories[name] = createTrajectory("lines");
					trajectories[name].my_name = name;
				}

				trajectories[name].addPoints(points);
			},

			updatePoints: function(name, points) {
				if(trajectories[name] === undefined) {
					console.log("creating new point plot '" + name + "'")
					trajectories[name] = createTrajectory("points");
					trajectories[name].my_name = name;
				}

				trajectories[name].addPoints(points);
			},

			reset: function() {
				$.each(trajectories, function(name, trajectory) {
					trajectory.reset();
				});
				
				$.each(markers, function(id, marker) {
					scene.remove(marker)
				});
				markers = {};
				covariance2d.visible = false;
			}
		};
	};
})
