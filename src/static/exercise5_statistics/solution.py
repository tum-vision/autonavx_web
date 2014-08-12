import numpy as np

def compute_means(lat,lon,alt):
    mean_lat = np.mean(lat)
    mean_lon = np.mean(lon)
    mean_alt = np.mean(alt)
    return (mean_lat,mean_lon,mean_alt)

def compute_vars(lat,lon,alt):
    var_lat = np.var(lat)
    var_lon = np.var(lon)
    var_alt = np.var(alt)
    return (var_lat,var_lon,var_alt)

def compute_cov(lat,lon,alt):
    cov_lat_lon = np.cov(lat,lon)
    cov_lon_alt = np.cov(lon,alt)
    cov_lat_alt = np.cov(lat,alt)
    return (cov_lat_lon,cov_lon_alt,cov_lat_alt)