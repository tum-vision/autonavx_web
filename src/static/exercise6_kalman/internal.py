class State:
    def __init__(self):
        self.position = np.zeros((3,1))
        self.velocity = np.zeros((3,1))

class Controller:
    def __init__(self):
        Kp_xy = 0.5
        Kp_z = 0.5
        Kd_xy = 0.5
        Kd_z = 0
        
        self.Kp = np.array([[Kp_xy, Kp_xy, Kp_z]]).T
        self.Kd = np.array([[Kd_xy, Kd_xy, Kd_z]]).T
    
    def compute_control_command(self, t, dt, state, state_desired):
        u = self.Kp * (state_desired.position - state.position) + self.Kd * (state_desired.velocity - state.velocity)
        return np.array([[max(min(u[0], 0.4), -0.4)], [max(min(u[1], 0.4), -0.4)], [max(min(u[2], 0.4), -0.4)]]);


class InternalCode:
    
    def __init__(self, simulator):
        
        self.simulator = simulator
        self.controller = Controller()
        self.state = State()
        self.state_desired = State()
        self.user = UserCode()
        self.noise_mean = 0.0
        self.noise_sigma = 0.001
        self.counter = 0
    
    def update_setpoint(self, t):
        import math
        part_t = 20.0;
        total_t = part_t * 4.0;
        normalized_t = t - int(t / total_t) * total_t;

        self.state_desired.position[2] = 0.0
        scale = 7.0;
        
        if normalized_t <  part_t:
            t1 = (normalized_t - 0) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 0.0 + t1 * 1.0) * scale;
            self.state_desired.position[1] = (t0 * 0.0 + t1 * 0.0) * scale;
            self.state_desired.velocity[0] = 0.35;
            self.state_desired.velocity[1] = 0;
        elif normalized_t < part_t * 2:
            t1 = (normalized_t - part_t) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 1.0 + t1 * 1.0) * scale;
            self.state_desired.position[1] = (t0 * 0.0 + t1 * 1.0) * scale;
            self.state_desired.velocity[0] = 0;
            self.state_desired.velocity[1] = 0.35;
        elif normalized_t < part_t * 3:
            t1 = (normalized_t - part_t * 2) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 1.0 + t1 * 0.0) * scale;
            self.state_desired.position[1] = (t0 * 1.0 + t1 * 1.0) * scale;
            self.state_desired.velocity[0] = -0.35;
            self.state_desired.velocity[1] = 0;
        elif normalized_t < part_t * 4:
            t1 = (normalized_t - part_t * 3) / part_t;
            t0 = 1.0 - t1;
            self.state_desired.position[0] = (t0 * 0.0 + t1 * 0.0) * scale;
            self.state_desired.position[1] = (t0 * 1.0 + t1 * 0.0) * scale;
            self.state_desired.velocity[0] = 0;
            self.state_desired.velocity[1] = -0.35;
        
        #self.state_desired.position[0] = math.sin(math.pi / 10.0 * t)
        #self.state_desired.position[1] = 0.0#math.cos(math.pi / 10.0 * t)
        #self.state_desired.position[2] = 0.0# * math.sin(math.pi / 10.0 * t)

    def noise(self):
        return np.random.normal(self.noise_mean, self.noise_sigma, (3, 1))
    
    def noise2(self):
        return np.random.normal(self.noise_mean, 0.5, (3, 1))
    
    def rotation_to_world(self, yaw):
        from math import cos, sin
        return np.array([[cos(yaw), -sin(yaw), 0], [sin(yaw), cos(yaw), 0], [0, 0, 1]])
    
    def measurement_callback(self, t, dt, navdata):        
        import plot
        
        rot = self.rotation_to_world(navdata.rotZ)
        self.state.velocity = np.dot(rot, np.array([[navdata.vx], [navdata.vy], [navdata.vz]]))# + self.noise()
        self.state.position += dt * self.state.velocity


        self.update_setpoint(t)
        self.kalman_state = State();
        self.kalman_state.position[0:2] = self.user.x[0:2];
        self.kalman_state.velocity[0:2] = self.user.x[2:4];
        lin_vel = self.controller.compute_control_command(t, dt, self.kalman_state, self.state_desired) + self.noise();
        self.simulator.set_input_world(lin_vel, 0)
        self.user.state_callback()

        vis_setpoint = self.state_desired.position;
        vis_setpoint[2] += 0.01
        plot.plot_trajectory("setpoint", vis_setpoint);

        if(self.counter % 15 == 0):
            measurement = self.state.position + self.noise2();
            self.user.measurement_callback(measurement[0:2])
    
        self.counter +=1
