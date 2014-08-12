class InternalCode:
    def __init__(self, simulator):
        from simulator.controller import MissionPlanner, PositionController
        
        self.simulator = simulator
        mission = MissionPlanner()
        mission.turn_left(45).forward(2).turn_left(90).forward(2).turn_left(90).forward(2).turn_left(90).forward(4).turn_right(90).forward(2).turn_right(90).forward(2).turn_right(90).forward(2)
        
        self.controller = PositionController(self.simulator.drone, mission.commands, False);
        self.user = UserCode()
    
    def measurement_callback(self, t, dt, navdata):
        self.user.measurement_callback(t, dt, navdata)
        
        lin_vel, yaw_vel = self.controller.compute_input()
        self.simulator.set_input_world(lin_vel, yaw_vel)
