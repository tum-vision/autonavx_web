import math
import numpy as np
from plot import plot_trajectory, plot_point, plot_covariance_2d

class Pose2D:
    def __init__(self, yaw, translation):
        from math import cos, sin
        
        if type(yaw) != type(translation):
            self.rotation = np.array([[cos(yaw), -sin(yaw)], [sin(yaw), cos(yaw)]])
        else:
            self.rotation = yaw
        self.translation = translation
        
    def inv(self):
        '''
        Inversion of this Pose2D object
        
        :return inverse of self
        '''
        inv_rotation = self.rotation.transpose()
        inv_translation = -np.dot(inv_rotation, self.translation)
        
        return Pose2D(inv_rotation, inv_translation)
    
    def yaw(self):
        from math import acos
        return acos(self.rotation[0,0])
        
    def __mul__(self, other):
        '''
        Multiplication of two Pose2D objects, e.g.:
            a = Pose3D(...) # = self
            b = Pose3D(...) # = other
            c = a * b       # = return value
        
        :param other: Pose3D right hand side
        :return product of self and other
        '''
        return Pose2D(np.dot(self.rotation, other.rotation), np.dot(self.rotation, other.translation) + self.translation)
        
class UserCode:
    def __init__(self):
        dt = 0.005
        
        #State-transition model
        self.A = np.array([
            [1,0,0,dt,0,0],
            [0,1,0,0,dt,0],
            [0,0,1,0,0,dt],
            [0,0,0,1,0,0],
            [0,0,0,0,1,0],
            [0,0,0,0,0,1]
        ]) 
        #Observation model
        self.H = np.array([[1,0,0,0,0,0],[0,1,0,0,0,0],[0,0,1,0,0,0]])
        
        
        #TODO: Play with the noise matrices
        #Process/State noise
        vel_noise_std = 0.001
        pos_noise_std = 0.00
        self.Q = np.array([
            [pos_noise_std*pos_noise_std,0,0,0,0,0],
            [0,pos_noise_std*pos_noise_std,0,0,0,0],
            [0,0,pos_noise_std*pos_noise_std,0,0,0],
            [0,0,0,vel_noise_std*vel_noise_std,0,0],
            [0,0,0,0,vel_noise_std*vel_noise_std,0],
            [0,0,0,0,0,vel_noise_std*vel_noise_std]
        ]) 
        
        #Sensor/Measurement noise
        measurement_noise_std = 0.0005
        self.R = measurement_noise_std * measurement_noise_std * np.identity(3)

        self.x = np.zeros((6,1)) #Initial state vector [x,y,psi,xdot,ydot,psidot]
        self.sigma = 0.01 * np.identity(6) #Initial covariance matrix
        
    
    def predictState(self, A, x):
        '''
        :param A: State-transition model matrix
        :param x: Current state vector
        :return x_p: Predicted state vector as 6x1 numpy array
        '''
        from math import atan2, sin, cos
        x_p = np.dot(A, x)
        
        while(x_p[2] > math.pi):
            x_p[2] -= 2 * math.pi
        while(x_p[2] < -math.pi):
            x_p[2] += 2 * math.pi
        #x_p[2] = math.atan2(math.sin(x_p[2]), math.cos(x_p[2])) #normalize yaw
        return x_p
    
    def predictCovariance(self, A, sigma, Q):
        sigma_p = np.dot(np.dot(A, sigma), np.transpose(A))+Q
        return sigma_p
    
    def calculateKalmanGain(self, sigma_p, H, R):
        k = np.dot(np.dot(sigma_p, H.T), np.linalg.inv(np.dot(H, np.dot(sigma_p, H.T)) + R))
        return k
    
    def correctState(self, z, x_p, k, z_p):
        '''
        :param z: Measurement vector
        :param x_p: Predicted state vector
        :param k: Kalman gain
        :param H: Observation model jacobian
        :return x: Corrected state vector as 6x1 numpy array
        '''
        print "residual", (z - z_p).T
        res = (z - z_p)
        
        #while(res[2] > math.pi):
        #    res[2] -= 2 * math.pi
        #while(res[2] < -math.pi):
        #    res[2] += 2 * math.pi
            
        x_corr = np.dot(k, res)
        x = x_p + x_corr
        print "correct", x_corr.T
        while(x[2] > math.pi):
            x[2] -= 2 * math.pi
        while(x[2] < -math.pi):
            x[2] += 2 * math.pi
        return x
    
    def correctCovariance(self, sigma_p, k, H):
        sigma = np.dot((np.identity(6)-np.dot(k, H)), sigma_p)
        return sigma
    
    def state_callback(self, dt, linear_velocity, yaw_velocity):
        from math import sin, cos
        
        self.x[3:5] = linear_velocity
        self.x[5] = yaw_velocity
        #print yaw_velocity
        self.A[0:2,3:5] = np.array([[cos(self.x[2]), -sin(self.x[2])], [sin(self.x[2]), cos(self.x[2])]]) * dt;
        self.A[3:5,3:5] = np.array([[cos(self.x[2]), -sin(self.x[2])], [sin(self.x[2]), cos(self.x[2])]]);
        
        self.x = self.predictState(self.A, self.x)        
        self.sigma = self.predictCovariance(self.A, self.sigma, self.Q)
        
        # visualize position state
        plot_trajectory("kalman", self.x[0:2])
        plot_covariance_2d("kalman", self.sigma[0:2,0:2])
        
    def measurement_callback(self, marker_position_world, marker_yaw_world, marker_position_relative, marker_yaw_relative):
        '''
        :param measurement: vector of measured coordinates
        '''
        
        while(marker_yaw_relative > math.pi):
            marker_yaw_relative -= 2 * math.pi
        while(marker_yaw_relative < -math.pi):
            marker_yaw_relative += 2 * math.pi
        from math import sin, cos
        #meas = Pose2D(marker_yaw_world, marker_position_world) * Pose2D(marker_yaw_relative, marker_position_relative).inv();
        measurement = np.array([[marker_position_relative[0], marker_position_relative[1], marker_yaw_relative]]).T
        
        s_psi = sin(self.x[2])
        c_psi = cos(self.x[2])
        
        #TODO: Enter the Jacobian derived in the previous assignment
        dx = marker_position_world[0] - self.x[0];
        dy = marker_position_world[1] - self.x[1];
        self.H = np.array([
                            [-c_psi,   -s_psi, s_psi * dx - c_psi * dy],
                            [ s_psi,   -c_psi, c_psi * dx + s_psi * dy],
                            [     0,        0,                      -1]
                            ])
        I = np.zeros((3,3))
        self.H = np.hstack((self.H,I))
        
        predicted_meas = Pose2D(self.x[2], self.x[0:2]).inv() * Pose2D(marker_yaw_world, marker_position_world);
        predicted_measurement = np.array([[predicted_meas.translation[0], predicted_meas.translation[1], predicted_meas.yaw()]]).T
        
        
        while(predicted_measurement[2] > math.pi):
            predicted_measurement[2] -= 2 * math.pi
        while(predicted_measurement[2] < -math.pi):
            predicted_measurement[2] += 2 * math.pi
        
        print "z_predicted", predicted_measurement.T
        print "z", measurement.T
        
        
        # visualize measurement
        plot_point("gps", measurement[0:2])
        
        k = self.calculateKalmanGain(self.sigma, self.H, self.R)
        #print "kalman", k
        #print "before", self.x.T
        self.x = self.correctState(measurement, self.x, k, predicted_measurement)
        self.sigma = self.correctCovariance(self.sigma, k, self.H)
        #print "after", self.x.T
        # visualize position state
        p = self.x[0:2]
        plot_trajectory("kalman", p)
        plot_covariance_2d("kalman", self.sigma[0:2,0:2])


