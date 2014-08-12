def _normalize_yaw_internal(y):
     while(y > math.pi):
         y -= 2 * math.pi
     while(y< -math.pi):
         y += 2 * math.pi
     return y

class InternalCode:
    
    def __init__(self, simulator):
        import plot
        import math
        
        self.simulator = simulator
        self.simulator.drone.x[2] = 1.0;
        self.user = UserCode()
        
        user_markers = self.user.get_markers()
        n_user_markers = len(user_markers)
        if n_user_markers > 30:
            print "You are only allowed to place 30 markers!"
            n_user_markers = 30
            
        self.markers = [];
        
        for i in range(n_user_markers):
            x = user_markers[i][0];
            y = user_markers[i][1];
            yaw = np.random.random((1,1))[0] * math.pi;
            
            plot.plot_marker((i + 1) * 50, np.array([[x, y]]).T, yaw);
            self.markers.append([x, y, yaw]);
        
        self.counter = 1
        self.marker_corners = [np.array([[0.1, 0.1, 1]]).T, np.array([[0.1, -0.1, 1]]).T, np.array([[-0.1, 0.1, 1]]).T, np.array([[-0.1, -0.1, 1]]).T]
        
        self.last_yaw = 0.0;
  
    def rotation_to_world(self, yaw):
        from math import cos, sin
        return np.array([[cos(yaw), -sin(yaw), 0], [sin(yaw), cos(yaw), 0], [0, 0, 1]])
    
    def is_marker_visible(self, m):
        import math
        Rq = self.rotation_to_world(self.simulator.drone.theta[2]).T;
        r_pos = np.dot(Rq, np.array([[ m[0], m[1], 0 ]]).T - self.simulator.drone.x);
                
        Rrel = np.dot(Rq, self.rotation_to_world(m[2]))
        r_yaw = m[2] - self.simulator.drone.theta[2];
        all_corners_visible = True
                
        for i in range(4):
            l = np.dot(Rrel, self.marker_corners[i] - r_pos);
            
            if abs(l[0]) > 0.6 or abs(l[1]) > 0.6:
                all_corners_visible = False
                break;
        
        return (all_corners_visible, r_pos, _normalize_yaw_internal(r_yaw));
    
    
    
    def measurement_callback(self, t, dt, navdata):        
        import plot
        from math import hypot
        
        yaw_vel = (navdata.rotZ - self.last_yaw) / dt
        self.last_yaw = navdata.rotZ
        
        noise_lin_vel = np.random.normal(0.0, 0.1, (2, 1))
        noise_yaw_vel = np.random.normal(0.0, 0.1, (1, 1))
        
        u = self.user.state_callback(t, dt, np.array([[navdata.vx, navdata.vy]]).T + noise_lin_vel, yaw_vel + noise_yaw_vel[0])
        
        #for beacon in self.user.beacons: #should the beacons be in user or internal? the grading safely happens in javascript right?
        #    if(hypot(beacon.position[0] - self.simulator.drone.x[0], beacon.position[1] - self.simulator.drone.x[1]) <= 0.5):
        #        self.user.beacon_callback(beacon)
    
        if(self.counter % 7 == 0): # approx. 30Hz
            
            for i in range(len(self.markers)):
                visible, rel_pos, rel_yaw = self.is_marker_visible(self.markers[i])
                
                if visible:
                    plot.plot_trajectory("test", self.simulator.drone.x);
                    plot.plot_trajectory("test", np.dot(self.rotation_to_world(self.simulator.drone.theta[2]), rel_pos) + self.simulator.drone.x);
                    
                    noise_pos = np.random.normal(0, 0.005, (2, 1));
                    noise_yaw = np.random.normal(0, 0.03, (1, 1));
                    
                    marker_pos_world = np.array([[self.markers[i][0], self.markers[i][1]]]).T
                    marker_pos_quadrotor = rel_pos[0:2] + noise_pos
                    
                    marker_yaw_world = self.markers[i][2]
                    marker_yaw_quadrotor = rel_yaw + noise_yaw[0]
                    
                    self.user.measurement_callback(marker_pos_world, marker_yaw_world, marker_pos_quadrotor, marker_yaw_quadrotor)
                    break;
        
        self.counter += 1
        
        lin_vel = np.zeros((2,1))
        yaw_vel = 0
        
        if type(u) is tuple and len(u) == 2:
            noise_lin_vel = np.random.normal(0.0, 0.15, (2, 1))
            noise_yaw_vel = np.random.normal(0.1, 0.1, (1, 1))
            
            lin_vel = u[0] + noise_lin_vel
            yaw_vel = u[1] + noise_yaw_vel[0]
        else:
            print "state_callback(...) should return a tuple of linear velocity control command (2x1 numpy.array) and yaw velocity command (float)!"
        
        u_internal = [lin_vel[0], lin_vel[1], yaw_vel, 0];
        
        self.simulator.set_input(u_internal)


