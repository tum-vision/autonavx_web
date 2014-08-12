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

	return function(element) {
		e = $(element);
		var overlay = $("#overlay"), new_overlay_text = "";
		var scene = new THREE.Scene();

		// setup camera
		var camera = new THREE.PerspectiveCamera(50, e.innerWidth() / e.innerHeight(), 0.1, 10000);
		camera.position.z = 1000;
		camera.position.y = -1000;
		camera.position.set(0, 0, 1000)

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
		
		//rotation animation stuff
		var drone = undefined;
		var animation_counter=0;
    	var animation_direction=1;
    	var initialQuaternion = new THREE.Quaternion();
    	var targetQuaternion = new THREE.Quaternion();
    	var interpolatedQuaternion = new THREE.Quaternion();

		var renderer = new THREE.WebGLRenderer();
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
		
			THREE.Quaternion.slerp(initialQuaternion, targetQuaternion, interpolatedQuaternion, animation_counter);
			if(drone){
			drone.rotation.setFromQuaternion(interpolatedQuaternion);
			}
			// Render
			renderer.render(scene, camera);
			animation_counter+=animation_direction*0.01;
			if(animation_counter>=1 || animation_counter<=0)
			{
				animation_direction=-animation_direction;
			}
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

		var loader = new ColladaLoader();
		var grid = new THREE.GridHelper(2000, 250);
		grid.rotation = new THREE.Euler(Math.PI/2, 0, 0 );
		scene.add(grid);
		
		scene.add(new THREE.AxisHelper(300));
		scene.add(new THREE.ArrowHelper( new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, 0, 0 ), 300, 0xDC143C ));
    	scene.add(new THREE.ArrowHelper( new THREE.Vector3( 0, 1, 0 ), new THREE.Vector3( 0, 0, 0 ), 300 ));
    	scene.add(new THREE.ArrowHelper( new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, 0 ), 300, 0x0000FF ));
			


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

		//material for drawing the lines
		var plot_material = new THREE.LineBasicMaterial({
			color: 0x0000ff,
		});

		var beacons = {}
		var inactive_beacon_material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
		var inactive_beacon_outline_material = new THREE.MeshBasicMaterial({ wireframe: true, wireframeLinewidth: 2, color: 0xaa0000 });
		var active_beacon_material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
		var active_beacon_outline_material = new THREE.MeshBasicMaterial({ wireframe: true, wireframeLinewidth: 2, color: 0x00aa00 });

		animate();

		var drone_motors = [];
		loader.load('assets/ardrone2.dae', function(result) {
			console.log("loaded drone model");
			drone = new THREE.Object3D(); 
			drone.add(new THREE.AxisHelper(300))
			var model = result.scene;
			model.rotation.z = -Math.PI * 0.5;
			drone.add(model);
			drone.add(new THREE.ArrowHelper( new THREE.Vector3( 1, 0, 0 ), new THREE.Vector3( 0, 0, 0 ), 300, 0xDC143C ));
        	drone.add(new THREE.ArrowHelper( new THREE.Vector3( 0, 1, 0 ), new THREE.Vector3( 0, 0, 0 ), 300 ));
        	drone.add(new THREE.ArrowHelper( new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( 0, 0, 0 ), 300, 0x0000FF ));
			drone.position.z = 200;
			

			scene.add(drone);
			var dir = new THREE.Vector3( 0, 0, 1 ), length = 150, hex = 0xff0000, headLength = 20, headWidth = 20, s = 2.5;

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
				drone.rotation.x = pose[3];
				drone.rotation.y = pose[4];
				drone.rotation.z = pose[5];
				drone.rotation.order = 'ZYX';
				var q = new THREE.Quaternion(0, 0, 0, 1);
				q = q.setFromEuler(drone.rotation)//.inverse();
				
				//drone.rotation.setFromQuaternion(q);
				
				drone.position.x = pose[0] * 500;
				drone.position.y = pose[1] * 500;
				drone.position.z = pose[2] * 500;
				
				//q.multiplyVector3(drone.position);

			},
			
			animateRotationMatrix: function( n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    			var m = new THREE.Matrix4( n11, n12, n13, 0, n21, n22, n23, 0, n31, n32, n33, 0, 0, 0, 0, 1 );
    			targetQuaternion.setFromRotationMatrix( m );
   			 },
   			
    		animateEuler: function(roll, pitch, yaw) {
    			var angles = new THREE.Euler( THREE.Math.degToRad(roll), THREE.Math.degToRad(pitch), THREE.Math.degToRad(yaw), 'ZYX' );
    			targetQuaternion.setFromEuler(angles);
    		},
    
    
    		animateAxisAngle: function( x,y,z,theta) {
    			//theta is angle in radians
    			var angle=THREE.Math.degToRad(theta);
    			var axis = new THREE.Vector3( x, y, z );
    			targetQuaternion.setFromAxisAngle( axis, angle );
    		},
    
    		animateQuaternion: function(x,y,z,w) {
    			//set as new target quaternion
    			targetQuaternion.set(x, y, z, w);
    		},
			
			setDroneMotorCommands: function(commands) {
				
				if(!drone) return;
				var avg = 1.4664606164383562;//(commands[0] + commands[1] + commands[2] + commands[3]) * 0.25;
				
				drone_motors[2].scale.y = 1.0 + (commands[0] - avg) * 10;
				drone_motors[3].scale.y = 1.0 + (commands[1] - avg) * 10;
				drone_motors[0].scale.y = 1.0 + (commands[2] - avg) * 10;
				drone_motors[1].scale.y = 1.0 + (commands[3] - avg) * 10;
				//drone_motors[0].scale.y = commands[0]*1;
				//drone_motors[3].scale.y = commands[1]*1;
				//drone_motors[2].scale.y = commands[2]*1;
				//drone_motors[1].scale.y = commands[3]*1;
			},

			setOverlayText: function(text) {
				new_overlay_text = text;
			},
			
			createBeacon: function(position) {
				return createBeacon(position);
			},

			updateTrajectory: function(name, points) {
				if(trajectories[name] === undefined) {
					trajectories[name] = createTrajectory();
					trajectories[name].my_name = name;
				}

				trajectories[name].addPoints(points);
			},

			add_waypoint: function(x, y, z) {
				x *= 500;
				y *= 500;
				z *= 500;

				if(trajectory_last_index + 2 >= trajectory_geometry.vertices.length) {
					// TODO: handle this
					console.log("trajectory overflow");
					return;
				}

				var waypoint_old = trajectory_geometry.vertices[trajectory_last_index];
				var dist = Math.sqrt(Math.pow(waypoint_old.x - x, 2) + Math.pow(waypoint_old.y - y, 2) + Math.pow(waypoint_old.z - z, 2));

				if(dist < (0.4 * 500.0)) return;

				trajectory_geometry.vertices[trajectory_last_index + 1].x = waypoint_old.x;
				trajectory_geometry.vertices[trajectory_last_index + 1].y = waypoint_old.y;
				trajectory_geometry.vertices[trajectory_last_index + 1].z = waypoint_old.z;

				trajectory_geometry.vertices[trajectory_last_index + 2].x = x;
				trajectory_geometry.vertices[trajectory_last_index + 2].y = y;
				trajectory_geometry.vertices[trajectory_last_index + 2].z = z;

				trajectory_last_index += 2;

				trajectory_geometry.verticesNeedUpdate = true;
			},
			reset: function() {
				$.each(trajectories, function(name, trajectory) {
					trajectory.reset();
				});
			}
		};
	};
})
