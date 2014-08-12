def run():
    import math
    import numpy as np
    def test_compute(g_rotation, g_translation, l_rotation, l_translation):
    
        r = None
        try:
            r = compute_quadrotor_pose(Pose3D(g_rotation, g_translation), Pose3D(l_rotation, l_translation))
        except Exception as e:
            print "exception in compute_quadrotor_pose"
            print e
        except:
            print "unknown exception in compute_quadrotor_pose"
        
        if type(r) is Pose3D:
            correct_rotation = np.dot(g_rotation, l_rotation.transpose())
            correct_translation = np.dot(g_rotation, -np.dot(l_rotation.transpose(), l_translation)) + g_translation
            
            result = np.allclose(correct_rotation, r.rotation) and np.allclose(correct_translation, r.translation)
            
            if not result:
            	print "error in compute_quadrotor_pose"
            	print "\nexpected Pose3D:"
            	print Pose3D(correct_rotation, correct_translation)
            	print "\ngot Pose3D:"
            	print r
            
            return result
        else:
            print "compute_quadrotor_pose should return a Pose3D object"
            return False
    
    def yaw_rotation(yaw):
        from math import sin, cos
        return np.array([[cos(yaw), -sin(yaw), 0], [sin(yaw), cos(yaw), 0], [0, 0, 1]])
    
    test_result_all = True
    test_result = True
    
    g_rotation = yaw_rotation(0);
    g_translation = np.array([[1], [1], [0]])
    
    l_rotation = yaw_rotation(0);
    l_translation = np.array([[0.2], [0.12], [0]])
    
    print "=== Test 1 - translation only ==="
    test_result = test_compute(g_rotation, g_translation, l_rotation, l_translation)
    test_result_all = test_result_all and test_result
    
    print "" + ("success" if test_result else "\nfailure") + ""
    
    g_rotation = yaw_rotation(math.pi * 0.5);
    g_translation = np.array([[1], [1], [0]])
    
    l_rotation = yaw_rotation(0);
    l_translation = np.array([[0.2], [0.12], [0]])
    
    print "=== Test 2 - translation and marker rotation ==="
    test_result = test_compute(g_rotation, g_translation, l_rotation, l_translation)
    test_result_all = test_result_all and test_result
    
    print "" + ("success" if test_result else "\nfailure")
    
    g_rotation = yaw_rotation(math.pi * 0.5);
    g_translation = np.array([[1], [1], [0]])
    
    l_rotation = yaw_rotation(math.pi * 0.25);
    l_translation = np.array([[0.2], [0.12], [0]])
    
    print "=== Test 3 - translation and quadrotor+marker rotation ==="
    test_result = test_compute(g_rotation, g_translation, l_rotation, l_translation)
    test_result_all = test_result_all and test_result
    
    print "" + ("success" if test_result else "\nfailure")
    
    if test_result_all:
        for i in range(10):
            rnd = np.random.random((6,1))
            g_rotation = yaw_rotation(math.pi * 0.5 * rnd[0]);
            g_translation = np.array([[rnd[1] * 2.0 - 1.0], [rnd[2] * 2.0 - 1.0], [0]])
            
            l_rotation = yaw_rotation(math.pi * 0.5 * rnd[3]);
            l_translation = np.array([[rnd[4] * 2.0 - 1.0], [rnd[5] * 2.0 - 1.0], [0]])
            
            test_result = test_compute(g_rotation, g_translation, l_rotation, l_translation)
            test_result_all = test_result_all and test_result
            
            if not test_result:
                break
    
    if test_result_all:
        return True
    else:
        return False
