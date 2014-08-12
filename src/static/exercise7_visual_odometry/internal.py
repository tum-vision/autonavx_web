class State:
    def __init__(self):
        self.position = np.zeros((3,1))
        self.orientation = np.zeros((3,1))
        self.lin_velocity = np.zeros((3,1))
        self.ang_velocity = np.zeros((3,1))
        
def _normalize_yaw_internal(y):
     while(y > math.pi):
         y -= 2 * math.pi
     while(y< -math.pi):
         y += 2 * math.pi
     return y

class Controller:
    def __init__(self):
        Kp_xy = 2.0
        Kp_z = 0.5
        self.Kp_psi = 0.5
        Kd_xy = 0.5
        Kd_z = 0
        self.Kd_psi = 0.0
        
        self.Kp_lin = np.array([[Kp_xy, Kp_xy, Kp_z]]).T
        self.Kd_lin = np.array([[Kd_xy, Kd_xy, Kd_z]]).T
        #self.Kp_ang = np.array([[Kp_psi, Kp_psi, Kp_psi]]).T
        #self.Kd_ang = np.array([[Kd_psi, Kd_psi, Kd_psi]]).T
    
    def compute_control_command(self, t, dt, state, state_desired):

        u_lin = self.Kp_lin * (state_desired.position - state.position) + self.Kd_lin * (state_desired.lin_velocity - state.lin_velocity)
        #u_ang = self.Kp_ang * (state_desired.orientation - state.orientation) + self.Kd_ang * (state_desired.ang_velocity - state.ang_velocity)

        cur_yaw = _normalize_yaw_internal(state.orientation[2])

        e_yaw = state_desired.orientation[2] - cur_yaw
        e_yaw = e_yaw - 2 * math.pi if e_yaw > math.pi else e_yaw
        e_yaw = e_yaw + 2 * math.pi if e_yaw < -math.pi else e_yaw

        u_yaw = self.Kp_psi * e_yaw
        max_vel = 1.5;
        return (np.array([[max(min(u_lin[0], max_vel), -max_vel)], [max(min(u_lin[1], max_vel), -max_vel)], [max(min(u_lin[2], max_vel), -max_vel)]]), u_yaw)


class InternalCode:
    
    def __init__(self, simulator):
        
        self.simulator = simulator
        self.simulator.drone.x[2] = 1.0;
        self.controller = Controller()
        self.state = State()
        self.state.position[2] = 1.0
        self.state_desired = State()
        self.state_desired.position[2] = 1.0
        self.user = UserCode()
        self.noise_mean = 0.0
        self.noise_sigma = 0.001
        self.counter = 1
        self.markers = [
            [1, 0.1, 0], [2, -0.15, 0], [3.5, 0.2, 0.1], [5, -0.05, -0.15], [7, 0.15, 0.45],
            [7-0.05, 1.3, 0.2], [7+0.1, 2.8, -0.8], [7-0.15, 4.5, -0.1], [7 + 0.05, 5.4, 1.3], [7, 6.9, -0.45],
            [5.5, 7 + 0.02, 0], [4.3, 7 +0.08, 0], [3.1, 7 - 0.1, 0.1], [2.0, 7 -0.05, -0.15], [0.5, 7.1, 0.45],
            [0.05, 5.4, 0.13], [0.1, 4.1, -0.08], [0.15, 2.9, -0.1], [0.05, 1.4, 1.3],
        ];
        self.marker_corners = [np.array([[0.1, 0.1, 1]]).T, np.array([[0.1, -0.1, 1]]).T, np.array([[-0.1, 0.1, 1]]).T, np.array([[-0.1, -0.1, 1]]).T]
        
        self.last_yaw = 0.0;
    
    def deg2rad(self, deg):
        import math
        return deg*math.pi/180
    
    def update_setpoint(self, t):
        import math
        part_t = 20.0;
        total_t = part_t * 4.0;
        normalized_t = t - int(t / total_t) * total_t;

        self.state_desired.position[2] = 1.0
        self.state_desired.orientation[0] = 0.0
        self.state_desired.orientation[1] = 0.0
        scale = 7.0;
        
        if normalized_t <  part_t:
            t1 = (normalized_t - 0) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 0.0 + t1 * 1.0) * scale;
            self.state_desired.position[1] = (t0 * 0.0 + t1 * 0.0) * scale;
            self.state_desired.orientation[2] = 0
            self.state_desired.lin_velocity[0] = 0.35;
            self.state_desired.lin_velocity[1] = 0;
        elif normalized_t < part_t * 2:
            t1 = (normalized_t - part_t) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 1.0 + t1 * 1.0) * scale;
            self.state_desired.position[1] = (t0 * 0.0 + t1 * 1.0) * scale;
            self.state_desired.orientation[2] = math.pi * 0.5
            self.state_desired.lin_velocity[0] = 0;
            self.state_desired.lin_velocity[1] = 0.35;
        elif normalized_t < part_t * 3:
            t1 = (normalized_t - part_t * 2) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 1.0 + t1 * 0.0) * scale;
            self.state_desired.position[1] = (t0 * 1.0 + t1 * 1.0) * scale;
            self.state_desired.orientation[2] = math.pi
            self.state_desired.lin_velocity[0] = -0.35;
            self.state_desired.lin_velocity[1] = 0;
        elif normalized_t < part_t * 4:
            t1 = (normalized_t - part_t * 3) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 0.0 + t1 * 0.0) * scale;
            self.state_desired.position[1] = (t0 * 1.0 + t1 * 0.0) * scale;
            self.state_desired.orientation[2] = -math.pi * 0.5
            self.state_desired.lin_velocity[0] = 0;
            self.state_desired.lin_velocity[1] = -0.35;
    

    def noise(self):
        return np.random.normal(self.noise_mean, self.noise_sigma, (3, 1))
    
    def noise2(self):
        return np.random.normal(self.noise_mean, 0.5, (3, 1))
    
    def rotation_to_world(self, yaw):
        from math import cos, sin
        return np.array([[cos(yaw), -sin(yaw), 0], [sin(yaw), cos(yaw), 0], [0, 0, 1]])
    
    
    def is_marker_visible(self, m, state):
        import math
        Rq = self.rotation_to_world(state.orientation[2]).T;
        r_pos = np.dot(Rq, np.array([[ m[0], m[1], 0 ]]).T - state.position);
                
        Rrel = np.dot(Rq, self.rotation_to_world(m[2]))
        r_yaw = m[2] - state.orientation[2];
        all_corners_visible = True
                
        for i in range(4):
            l = np.dot(Rrel, self.marker_corners[i] - r_pos);
            
            if abs(l[0]) > 0.6 or abs(l[1]) > 0.6:
                all_corners_visible = False
                break;
        
        return (all_corners_visible, r_pos, _normalize_yaw_internal(r_yaw));
    
    
    
    def measurement_callback(self, t, dt, navdata):        
        import plot
                
        rot = self.rotation_to_world(navdata.rotZ)
        self.state.lin_velocity = np.dot(rot, np.array([[navdata.vx], [navdata.vy], [navdata.vz]]))

        self.state.position += dt * self.state.lin_velocity
        self.state.orientation = np.array([[navdata.rotX], [navdata.rotY], [navdata.rotZ]])

        self.update_setpoint(t)

        yaw_vel = (navdata.rotZ - self.last_yaw) / dt
        self.last_yaw = navdata.rotZ
        
        noise_lin_vel = np.random.normal(0.0, 0.5, (2, 1))
        noise_yaw_vel = np.random.normal(0.05, 0.5, (1, 1))
        
        self.user.state_callback(t, dt, np.array([[navdata.vx, navdata.vy]]).T + noise_lin_vel, yaw_vel + noise_yaw_vel[0])

        vis_setpoint = self.state_desired.position;
        vis_setpoint[2] += 0.01
        plot.plot_trajectory("setpoint", vis_setpoint);

        if(self.counter % 7 == 0): # approx. 30Hz
            
            for i in range(len(self.markers)):
                visible, rel_pos, rel_yaw = self.is_marker_visible(self.markers[i], self.state)
                
                if visible:
                    plot.plot_trajectory("test", self.state.position);
                    plot.plot_trajectory("test", np.dot(self.rotation_to_world(self.state.orientation[2]), rel_pos) + self.state.position);
                    
                    noise_pos = np.random.normal(0, 0.005, (2, 1));
                    noise_yaw = np.random.normal(0, 0.03, (1, 1));
                    
                    marker_pos_world = np.array([[self.markers[i][0], self.markers[i][1]]]).T
                    marker_pos_quadrotor = rel_pos[0:2] + noise_pos
                    
                    marker_yaw_world = self.markers[i][2]
                    marker_yaw_quadrotor = rel_yaw + noise_yaw[0]
                    
                    self.user.measurement_callback(marker_pos_world, marker_yaw_world, marker_pos_quadrotor, marker_yaw_quadrotor)
                    break;
                        
    
        self.counter +=1

        self.kalman_state = State();
        self.kalman_state.position[0:2] = self.user.x[0:2]; #xy
        self.kalman_state.position[2] = self.state.position[2]; #z
        self.kalman_state.orientation[2] = self.user.x[2]; #psi

        #self.kalman_state.lin_velocity[0:2] = self.user.x[3:5]; #xdot,ydot
        #self.kalman_state.ang_velocity[2] = self.user.x[5]; #psidot
                    
        #print "est yaw: ", self.kalman_state.orientation[2]
        
        tmp = navdata.rotZ
    
        while(tmp > math.pi):
            tmp -= 2 * math.pi
        while(tmp < -math.pi):
           tmp += 2 * math.pi
        #print "act yaw: ", tmp
        
        lin_vel, ang_vel = self.controller.compute_control_command(t, dt, self.kalman_state, self.state_desired) + self.noise();
        self.simulator.set_input_world(lin_vel, ang_vel)
