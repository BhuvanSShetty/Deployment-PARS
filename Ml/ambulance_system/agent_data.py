import pandas as pd
import numpy as np

def generate_data(output_file='emergency_points.csv'):
    np.random.seed(42)

    # Bengaluru approximate bounds
    # Center: ~12.9716, 77.5946
    
    def generate_circle_points(lat_c, lon_c, max_radius_deg, n_points):
        # r = radius * sqrt(random) gives uniform distribution across a circle area
        r = max_radius_deg * np.sqrt(np.random.uniform(0, 1, n_points))
        theta = np.random.uniform(0, 2*np.pi, n_points)
        return lat_c + r * np.sin(theta), lon_c + r * np.cos(theta)

    # 200 High-Risk Clusters - Weight 10 (tight dense circle, radius ~ 5km = ~0.045 deg)
    high_risk_lats, high_risk_lons = generate_circle_points(12.9716, 77.5946, 0.045, 200)
    
    # 500 Accident Hotspots - Weight 8
    accident_lats, accident_lons = generate_circle_points(12.9716, 77.5946, 0.08, 500)
    
    # 300 Remote Zones - Weight 5 (spread up to ~16km edge)
    remote_lats, remote_lons = generate_circle_points(12.9716, 77.5946, 0.15, 300)
    
    # 5000 Base points (Rest of the city) - Weight 1
    # Gaussian distribution naturally creates a circular fade out without square edges!
    base_lats = np.random.normal(12.9716, 0.06, 5000)
    base_lons = np.random.normal(77.5946, 0.06, 5000)
    
    # No artificial clipping - clipping causes hard square borders!
    
    data = []
    
    for lat, lon in zip(high_risk_lats, high_risk_lons):
        data.append({'Latitude': lat, 'Longitude': lon, 'Weight': 10, 'Type': 'High-Risk'})
        
    for lat, lon in zip(accident_lats, accident_lons):
        data.append({'Latitude': lat, 'Longitude': lon, 'Weight': 8, 'Type': 'Accident'})
        
    for lat, lon in zip(remote_lats, remote_lons):
        data.append({'Latitude': lat, 'Longitude': lon, 'Weight': 5, 'Type': 'Remote'})
        
    for lat, lon in zip(base_lats, base_lons):
        data.append({'Latitude': lat, 'Longitude': lon, 'Weight': 1, 'Type': 'Base'})
        
    df = pd.DataFrame(data)
    df.to_csv(output_file, index=False)
    print(f"Generated {len(df)} points and saved to {output_file}")
    return output_file

if __name__ == "__main__":
    generate_data()
