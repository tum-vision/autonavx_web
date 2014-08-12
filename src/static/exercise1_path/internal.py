class InternalCode:
    def __init__(self, simulator):
        from simulator.controller import MissionPlanner, PositionController

        self.simulator = simulator
        mission = MissionPlanner()

        plan_mission(mission)

        self.controller = PositionController(self.simulator.drone, mission.commands, True);

    def measurement_callback(self, t, dt, navdata):
        lin_vel, yaw_vel = self.controller.compute_input()
        self.simulator.set_input_world(lin_vel, yaw_vel)
