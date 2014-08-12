import quadrotor.command as cmd
from math import sqrt

def plan_mission(mission):

    # this is an example illustrating the different motion commands,
    # replace them with your own commands and activate all beacons
    commands  = [
        cmd.down(0.5),
        cmd.right(1),
        cmd.turn_left(45),
        cmd.forward(sqrt(2)),
        cmd.turn_right(45),
        cmd.right(1),
        cmd.turn_left(45),
        cmd.forward(sqrt(0.5)),
        cmd.turn_left(90),
        cmd.forward(sqrt(0.5)),
        cmd.turn_left(45),
        cmd.forward(1),
        cmd.turn_right(45),
        cmd.backward(sqrt(2)),
        cmd.turn_left(45),
        cmd.forward(1),
    ]

    mission.add_commands(commands)
