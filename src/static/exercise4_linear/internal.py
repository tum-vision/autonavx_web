enable_noise = False
enable_delay = False

def run():
    def noise(sigma):
        import numpy
        return numpy.random.normal(0, sigma, 1).item(0) if sigma > 0 else 0;
    
    import math
    from plot import plot
    u = 0
    m = 2.0 # mass
    x = 0
    vx = 0
    ax = 0
    t = 0
    t_max = 30
    dt = 0.01
    steps = int(t_max / dt) + 1;
    setpoint = 5
    
    measurement_noise = 0.03 if enable_noise else 0
    measurement_delay = 20 if enable_delay else 1
    control_noise = 0.0
    control_delay = measurement_delay
    
    u_limit = 100
    x_measurements = [x + noise(measurement_noise) for i in range(measurement_delay)]
    vx_measurements = [vx + noise(measurement_noise) for i in range(measurement_delay)]
    
    control = [0] * control_delay;
    user = UserCode()
    
    stable_t = t_max;
    overshoot = 0
    
    for i in range(steps):
        current = x_measurements.pop(0)
        vel = vx_measurements.pop(0)
        
        control.append(user.compute_control_command(t, dt, current, setpoint) + noise(control_noise))
        
        diff = setpoint - current;
        diff_norm = math.sqrt(diff * diff);
        if(diff_norm > 3.5 * measurement_noise + 0.01):
            stable_t = t;
        overshoot = max(overshoot, max(current - setpoint, 0));
        
        u = max(min(control.pop(0), u_limit), -u_limit) # input = force
        
        t += dt;
        x += dt * vx
        vx += dt * ax
        
        ax = u / m
        
        x_measurements.append(x + noise(measurement_noise))
        vx_measurements.append(vx + noise(measurement_noise))
        plot("x_measured", x)
        plot("x_desired", setpoint)
    print "stable after:", stable_t, "overshoot:", overshoot
    return (stable_t, overshoot)
