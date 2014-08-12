import numpy as np

def run():
    # create a column vector
    col_vec = np.array([[1], [2]])
    print "column vector"
    print col_vec
    
    # create a row vector
    row_vec = np.array([[1, 2]])
    print "row vector"
    print row_vec
    
    # create a matrix
    mat = np.array([[1, 2], [3, 4]])
    print "matrix"
    print mat
    
    # inspect dimensions
    print "row vector dimensions", row_vec.ndim
    shape = row_vec.shape
    print "row vector rows", shape[0], "columns", shape[1]
    
    print "matrix dimensions", mat.ndim
    shape = mat.shape
    print "matrix rows", shape[0], "columns", shape[1]
    
    # transpose
    vec_t = row_vec.transpose() # or row_vec.T
    print "transposed vector"
    print vec_t
    
    mat_t = mat.transpose() # or mat.T
    print "transposed matrix"
    print mat_t
    
    a = np.array([[2], [-4], [1]])
    b = np.array([[2], [1], [-2]])
    
    # addition 
    print "a + b"
    print a + b
    
    # subtraction
    print "a - b"
    print a - b
    
    # scalar multiplication
    print "1.2 * a"
    print 1.2 * a
    
    # element wise multiplication
    print "a * b"
    print a * b    
    
    # vector scalar product
    print "a . b"
    print np.dot(a.transpose(), b)
    
    # vector cross product
    print "a x b"
    print np.cross(a, b, axis=0) # or np.cross(a.T, b.T).T
    
    identity = np.array([[1, 0], [0, 1]])
    
    # matrix vector product
    print "identity . col_vec"
    print np.dot(identity, col_vec)
    
    # matrix product
    print "identity . mat"
    print np.dot(identity, mat)
    
    
