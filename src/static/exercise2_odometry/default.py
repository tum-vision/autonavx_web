import numpy as np
from plot import plot_trajectory

class UserCode:
    def __init__(self):
        self.position = np.array([[0], [0]])
        
    def measurement_callback(self, t, dt, navdata):
        '''
        :param t: time since simulation start
        :param dt: time since last call to measurement_callback
        :param navdata: measurements of the quadrotor
        '''
        
        # TODO: update self.position by integrating measurements contained in navdata
        plot_trajectory("odometry", self.position)
