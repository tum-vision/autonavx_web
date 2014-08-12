import numpy as np
from plot import plot_trajectory, plot_point, plot_covariance_2d

class UserCode:
    def __init__(self):
        dt = 0.005
        
        #State-transition model
        self.A = np.array([
            [1,0,dt,0],
            [0,1,0,dt],
            [0,0,1,0],
            [0,0,0,1]
        ]) 
        #Observation model
        self.H = np.array([[1,0,0,0],[0,1,0,0]]) 
        
        #TODO: Play with the noise matrices
        #Process/State noise
        vel_noise_std = 0.001
        pos_noise_std = 0.0
        self.Q = np.array([
            [pos_noise_std*pos_noise_std,0,0,0],
            [0,pos_noise_std*pos_noise_std,0,0],
            [0,0,vel_noise_std*vel_noise_std,0],
            [0,0,0,vel_noise_std*vel_noise_std]
        ]) 
        
        #Sensor/Measurement noise
        measurement_noise_std = 0.5
        self.R = measurement_noise_std * measurement_noise_std * np.identity(2) 

        self.x = np.zeros((4,1)) #Initial state vector [x,y,vx,vy]
        self.sigma = np.identity(4) #Initial covariance matrix
    
    def predictState(self, A, x):
        '''
        :param A: State-transition model matrix
        :param x: Current state vector
        :return x_p: Predicted state vector as 4x1 numpy array
        '''
        
        #TODO: Predict the next state
        x_p = np.zeros((4,1))
        
        return x_p
    
    def predictCovariance(self, A, sigma, Q):
        sigma_p = np.dot(np.dot(A, sigma), np.transpose(A))+Q
        return sigma_p
    
    def calculateKalmanGain(self, sigma_p, H, R):
        k = np.dot(np.dot(sigma_p, np.transpose(H)), np.linalg.inv(np.dot(H, np.dot(sigma_p, np.transpose(H)))+R))
        return k
    
    def correctState(self, z, x_p, k, H):
        '''
        :param z: Measurement vector
        :param x_p: Predicted state vector
        :param k: Kalman gain
        :param H: Observation model
        :return x: Corrected state vector as 4x1 numpy array
        '''
        
        #TODO: Correct the current state prediction with the measurement
        x = np.zeros((4,1))

        return x
    
    def correctCovariance(self, sigma_p, k, H):
        sigma = np.dot((np.identity(4)-np.dot(k, H)), sigma_p)
        return sigma
    
    def state_callback(self):
        self.x = self.predictState(self.A, self.x)
        self.sigma = self.predictCovariance(self.A, self.sigma, self.Q)
        
        # visualize position state
        plot_trajectory("kalman", self.x[0:2])
        plot_covariance_2d("kalman", self.sigma[0:2,0:2])
        
    def measurement_callback(self, measurement):
        '''
        :param measurement: vector of measured coordinates
        '''
        
        # visualize measurement
        plot_point("gps", measurement)
        
        k = self.calculateKalmanGain(self.sigma, self.H, self.R)
        
        self.x = self.correctState(measurement, self.x, k, self.H)
        self.sigma = self.correctCovariance(self.sigma, k, self.H)
        
        # visualize position state
        plot_trajectory("kalman", self.x[0:2])
        plot_covariance_2d("kalman", self.sigma[0:2,0:2])
