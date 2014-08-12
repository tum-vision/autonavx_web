import numpy as np

class InternalCode:
    
    def __init__(self, simulator):
        self.simulator = simulator
        
        initial_state = State()
        measurement_delay = 40 if self.enable_delay else 1
        self.state = [self.copy_state(initial_state) for i in range(measurement_delay)]
        self.state_desired = State()
        
        if self.setpoint == 'fix':
            self.state_desired.position[0] = 1
            self.state_desired.position[2] = 0.5
        elif self.setpoint == 'random':
            self.state_desired.position = np.random.random((3,1))
            self.state_desired.position[0:2] *= 2.0
            self.state_desired.position[0:2] -= 1.0
        
        self.noise_mean = 0.0
        self.noise_sigma = 0.2
        
        self.user = UserCode()
        
    
    def copy_state(self, s):
        c = State()
        c.position = np.copy(s.position)
        c.velocity = np.copy(s.velocity)
        
        return c

    def update_setpoint(self, t):
        if self.setpoint == 'circle':
		    import math
            self.state_desired.position[0] = math.sin(math.pi / 10.0 * t)
            self.state_desired.position[1] = math.cos(math.pi / 10.0 * t)
            self.state_desired.position[2] = 0.0# * math.sin(math.pi / 10.0 * t)
            
    
    def noise(self):
        return np.random.normal(self.noise_mean, self.noise_sigma, (3, 1)) if self.enable_noise else 0;
    
    def rotation_to_world(self, yaw):
        from math import cos, sin
        return np.array([[cos(yaw), -sin(yaw), 0], [sin(yaw), cos(yaw), 0], [0, 0, 1]])
    
    def measurement_callback(self, t, dt, navdata):
        from plot import plot, plot_trajectory
        #plot("x_true", self.simulator.drone.x[0])
        #plot("y_true", self.simulator.drone.x[1])
        #plot("z_true", self.simulator.drone.x[2])
    
        rot = self.rotation_to_world(navdata.rotZ)
        
        updated_state = self.copy_state(self.state[-1]);
        updated_state.velocity = np.dot(rot, np.array([[navdata.vx], [navdata.vy], [navdata.vz]])) + self.noise()
        updated_state.position += dt * updated_state.velocity
        self.state.append(updated_state);
        
        current = self.state.pop(0)

        self.update_setpoint(t)
        
        plot_trajectory("setpoint", self.state_desired.position)
        plot_trajectory("integrated", current.position)
        lin_vel = self.user.compute_control_command(t, dt, current, self.copy_state(self.state_desired))
        
        self.simulator.set_input_world(lin_vel, 0)
