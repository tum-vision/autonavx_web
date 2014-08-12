import math
import numpy as np

class Beacon:
    def __init__(self, position, status):
        self.position = position
        self.active = status

class Pose2D:
    def __init__(self, rotation, translation):
        self.rotation = rotation
        self.translation = translation
    
    def inv(self):
        '''
            inversion of this Pose2D object
            
            :return - inverse of self
            '''
        inv_rotation = self.rotation.transpose()
        inv_translation = -np.dot(inv_rotation, self.translation)
        
        return Pose2D(inv_rotation, inv_translation)
    
    def yaw(self):
        from math import atan2
        return atan2(self.rotation[1,0], self.rotation[0,0])
    
    def __mul__(self, other):
        '''
            multiplication of two Pose2D objects, e.g.:
            a = Pose2D(...) # = self
            b = Pose2D(...) # = other
            c = a * b       # = return value
            
            :param other - Pose2D right hand side
            :return - product of self and other
            '''
        return Pose2D(np.dot(self.rotation, other.rotation), np.dot(self.rotation, other.translation) + self.translation)

class State:
    def __init__(self):
        self.position = np.zeros((2,1))
        self.orientation = np.zeros((3,1))
        self.lin_velocity = np.zeros((2,1))
        self.ang_velocity = np.zeros((3,1))

class Controller:
    def __init__(self):
        Kp_xy = 2.0
        self.Kp_psi = 0.5
        Kd_xy = 1
        self.Kd_psi = 0.0
        
        self.Kp_lin = np.array([[Kp_xy, Kp_xy]]).T
        self.Kd_lin = np.array([[Kd_xy, Kd_xy]]).T
    
    def normalize_yaw(self, y):
        import math
        while(y > math.pi):
            y -= 2 * math.pi
        while(y < -math.pi):
            y += 2 * math.pi
        return y
    
    def compute_control_command(self, t, dt, state, state_desired):
        
        u_lin = self.Kp_lin * (state_desired.position - state.position) + self.Kd_lin * (state_desired.lin_velocity - state.lin_velocity)
        
        cur_yaw = self.normalize_yaw(state.orientation[2])
        
        e_yaw = state_desired.orientation[2] - cur_yaw
        e_yaw = e_yaw - 2 * math.pi if e_yaw > math.pi else e_yaw
        e_yaw = e_yaw + 2 * math.pi if e_yaw < -math.pi else e_yaw
        
        u_yaw = self.Kp_psi * e_yaw
        max_vel = 1.5;
        return (np.array([[max(min(u_lin[0], max_vel), -max_vel)], [max(min(u_lin[1], max_vel), -max_vel)]]), u_yaw)

class UserCode:
    def __init__(self):
        self.state = State()
        self.state_desired = State()
        self.controller = Controller()
        
        pos_noise_std = 0.005
        yaw_noise_std = 0.005
        self.Q = np.array([
                           [pos_noise_std*pos_noise_std,0,0],
                           [0,pos_noise_std*pos_noise_std,0],
                           [0,0,yaw_noise_std*yaw_noise_std]
                           ])
                           
        z_pos_noise_std = 0.005
        z_yaw_noise_std = 0.03
        self.R = np.array([
                           [z_pos_noise_std*z_pos_noise_std,0,0],
                           [0,z_pos_noise_std*z_pos_noise_std,0],
                           [0,0,z_yaw_noise_std*z_yaw_noise_std]
                           ])
                                              
        self.x = np.zeros((3,1))
                                              
        self.sigma = 0.01 * np.identity(3)
        tx = 6
        ty = 11
        ux = 3.5
        uy = 7
        mx = 1
        my = 2
        self.beacons = [Beacon([mx+0.5, my-1.5],False),
                        Beacon([mx+2,   my-1.5],False),
                        Beacon([mx+3.5, my-1.5],False),
                        Beacon([mx+2.5, my+0],False),
                        Beacon([mx+3.5, my+1.5],False),
                        Beacon([mx+2, my+1.5],False),
                        Beacon([mx+0.5, my+1.5],False),
                        Beacon([ux+3.5, uy-1.5],False),
                        Beacon([ux+2, uy-1.5],False),
                        Beacon([ux+0.5, uy-1.5],False),
                        Beacon([ux+0.5, uy+0],False),
                        Beacon([ux+0.5, uy+1.5],False),
                        Beacon([ux+2, uy+1.5],False),
                        Beacon([ux+3.5, uy+1.5],False),
                        Beacon([tx+0.5, ty+0],False),
                        Beacon([tx+2, ty+0],False),
                        Beacon([tx+3.5, ty-1.5],False),
                        Beacon([tx+3.5, ty+0],False),
                        Beacon([tx+3.5, ty+1.5],False)
                        ]
    
        self.state_desired.position = np.array([[mx+0.5],[my-1.5]])
    
    def normalizeYaw(self, y):
        '''
            normalizes the given angle to the interval [-pi, +pi]
            '''
        while(y > math.pi):
            y -= 2 * math.pi
        while(y < -math.pi):
            y += 2 * math.pi
        return y
    
    def rotation(self, yaw):
        '''
            create 2D rotation matrix from given angle
            '''
        s_yaw = math.sin(yaw)
        c_yaw = math.cos(yaw)
        
        return np.array([
                         [c_yaw, -s_yaw],
                         [s_yaw,  c_yaw]
                         ])
    
    def get_markers(self):
        '''
        place up to 30 markers in the world
        '''
        markers = []
        for beacon in self.beacons:
            markers.append(beacon.position)
        return markers
    
    
    def predictState(self, dt, x, u_linear_velocity, u_yaw_velocity):
        '''
        predicts the next state using the current state and
        the control inputs local linear velocity and yaw velocity
        '''
        x_p = np.zeros((3, 1))
        x_p[0:2] = x[0:2] + dt * np.dot(self.rotation(x[2]), u_linear_velocity)
        x_p[2]   = x[2]   + dt * u_yaw_velocity
        x_p[2]   = self.normalizeYaw(x_p[2])
        
        return x_p
    
    def calculatePredictStateJacobian(self, dt, x, u_linear_velocity, u_yaw_velocity):
        '''
        calculates the 3x3 Jacobian matrix for the predictState(...) function
        '''
        s_yaw = math.sin(x[2])
        c_yaw = math.cos(x[2])
        
        dRotation_dYaw = np.array([
                                   [-s_yaw, -c_yaw],
                                   [ c_yaw, -s_yaw]
                                   ])
        F = np.identity(3)
        F[0:2, 2] = dt * np.dot(dRotation_dYaw, u_linear_velocity)
                                   
        return F
    
    def predictCovariance(self, sigma, F, Q):
        '''
        predicts the next state covariance given the current covariance,
        the Jacobian of the predictState(...) function F and the process noise Q
        '''
        return np.dot(F, np.dot(sigma, F.T)) + Q
    
    def calculateKalmanGain(self, sigma_p, H, R):
        '''
        calculates the Kalman gain
        '''
        return np.dot(np.dot(sigma_p, H.T), np.linalg.inv(np.dot(H, np.dot(sigma_p, H.T)) + R))
    
    def correctState(self, K, x_predicted, z, z_predicted):
        '''
        corrects the current state prediction using Kalman gain, the measurement and the predicted measurement
            
        :param K - Kalman gain
        :param x_predicted - predicted state 3x1 vector
        :param z - measurement 3x1 vector
        :param z_predicted - predicted measurement 3x1 vector
        :return corrected state as 3x1 vector
        '''
        residual = (z - z_predicted)
        residual[2] = self.normalizeYaw(residual[2])
        
        return x_predicted + np.dot(K, residual)
    
    def correctCovariance(self, sigma_p, K, H):
        '''
        corrects the sate covariance matrix using Kalman gain and the Jacobian matrix of the predictMeasurement(...) function
        '''
        return np.dot(np.identity(3) - np.dot(K, H), sigma_p)
    
    def predictMeasurement(self, x, marker_position_world, marker_yaw_world):
        '''
        predicts a marker measurement given the current state and the marker position and orientation in world coordinates
        '''
        z_predicted = Pose2D(self.rotation(x[2]), x[0:2]).inv() * Pose2D(self.rotation(marker_yaw_world), marker_position_world);
        
        return np.array([[z_predicted.translation[0], z_predicted.translation[1], z_predicted.yaw()]]).T
    
    def calculatePredictMeasurementJacobian(self, x, marker_position_world, marker_yaw_world):
        '''
        calculates the 3x3 Jacobian matrix of the predictMeasurement(...) function using the current state and
        the marker position and orientation in world coordinates
        
        :param x - current state 3x1 vector
        :param marker_position_world - x and y position of the marker in world coordinates 2x1 vector
        :param marker_yaw_world - orientation of the marker in world coordinates
        :return - 3x3 Jacobian matrix of the predictMeasurement(...) function
        '''
        s_yaw = math.sin(x[2])
        c_yaw = math.cos(x[2])
        
        dx = marker_position_world[0] - x[0];
        dy = marker_position_world[1] - x[1];
        
        return np.array([
                         [-c_yaw, -s_yaw, s_yaw * dx - c_yaw * dy],
                         [ s_yaw, -c_yaw, c_yaw * dx + s_yaw * dy],
                         [     0,      0,                      -1]
                         ])
    
    def state_callback(self, t, dt, linear_velocity, yaw_velocity):
        '''
        called when a new odometry measurement arrives approx. 200Hz
    
        :param t - simulation time
        :param dt - time difference this last invocation
        :param linear_velocity - x and y velocity in local quadrotor coordinate frame (independet of roll and pitch)
        :param yaw_velocity - velocity around quadrotor z axis (independet of roll and pitch)
        '''
        self.x = self.predictState(dt, self.x, linear_velocity, yaw_velocity)
        
        F = self.calculatePredictStateJacobian(dt, self.x, linear_velocity, yaw_velocity)
        self.sigma = self.predictCovariance(self.sigma, F, self.Q);
        
        self.kalman_state = State();
        self.kalman_state.position = self.x[0:2];
        self.kalman_state.orientation[2] = self.x[2];
        return self.controller.compute_control_command(t, dt, self.kalman_state, self.state_desired)


    def measurement_callback(self, marker_position_world, marker_yaw_world, marker_position_relative, marker_yaw_relative):
        '''
        called when a new marker measurement arrives max 30Hz, marker measurements are only available if the quadrotor is
        sufficiently close to a marker
            
        :param marker_position_world - x and y position of the marker in world coordinates 2x1 vector
        :param marker_yaw_world - orientation of the marker in world coordinates
        :param marker_position_relative - x and y position of the marker relative to the quadrotor 2x1 vector
        :param marker_yaw_relative - orientation of the marker relative to the quadrotor
        '''
        z = np.array([[marker_position_relative[0], marker_position_relative[1], marker_yaw_relative]]).T
        z_predicted = self.predictMeasurement(self.x, marker_position_world, marker_yaw_world)
        
        H = self.calculatePredictMeasurementJacobian(self.x, marker_position_world, marker_yaw_world)
        K = self.calculateKalmanGain(self.sigma, H, self.R)
        
        self.x = self.correctState(K, self.x, z, z_predicted)
        self.sigma = self.correctCovariance(self.sigma, K, H)
        
        for beacon in self.beacons:
            diff = self.x[0:2] - np.array([beacon.position]).T
            norm = np.dot(diff.T, diff)
            if math.sqrt(norm[0]) < 0.2:
                self.beacon_callback(beacon)
                break
    
    def beacon_callback(self, active_beacon):
        '''
        called when a beacon was activated
        '''
        for i in range(len(self.beacons)):
            if (self.beacons[i].position == active_beacon.position):
                self.beacons[i].active = True
                for j in range(len(self.beacons)):
                    if (self.beacons[j].active == False):
                        self.state_desired.position = np.array([[self.beacons[j].position[0]],[self.beacons[j].position[1]]])
                        return
