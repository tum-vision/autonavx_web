import quadrotor.command as cmd
from math import sqrt

def plan_mission(mission):

    mission.add_commands([
        cmd.up(1.0),
        cmd.forward(1),
        cmd.left(2),
        cmd.forward(4),
        cmd.turn_left(45),
        cmd.backward(sqrt(32)),
        cmd.turn_right(45),
        cmd.forward(4),
        cmd.left(2),
    ])
