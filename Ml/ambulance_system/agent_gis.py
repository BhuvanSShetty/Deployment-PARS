import pandas as pd
import osmnx as ox
import networkx as nx
import geopandas as gpd
from shapely.geometry import Point, MultiPoint
import json

def generate_isochrones(hubs_file='hubs.csv', output_file='isochrones.geojson', travel_time=8):
    hubs = pd.read_csv(hubs_file)
    isochrone_polys = []
    travel_time_seconds = travel_time * 60

    print(f"Loading local area geometries for {len(hubs)} hubs...")
    
    hubs_pts = gpd.GeoSeries([Point(lon, lat) for lon, lat in zip(hubs['Longitude'], hubs['Latitude'])], crs="EPSG:4326").to_crs("EPSG:3857")

    import random
    
    for idx, row in hubs.iterrows():
        lat, lon = row['Latitude'], row['Longitude']
        hub_type = row.get('Hub_Type', 'Primary')
        print(f"Processing {hub_type} hub {idx+1}/{len(hubs)}: Lat {lat:.4f}, Lon {lon:.4f}")
        
        try:
            pt = hubs_pts.iloc[idx]
            distances = hubs_pts.distance(pt)
            distances = distances[distances > 0] # exclude self
            
            if len(distances) > 0:
                min_dist = distances.min()
                # allow exactly at most ~20% overlap by capping slightly over half the distance
                max_allowed_radius = (min_dist / 2.0) * 1.2
            else:
                max_allowed_radius = 5000
                
            # Traffic Simulation Logic
            if hub_type == 'Primary':
                densities = ['Heavy (15 km/h)', 'Moderate (30 km/h)', 'Light (50 km/h)']
                speeds = [15, 30, 50]
                choice = random.randint(0, 2)
                t_density = densities[choice]
                t_speed = speeds[choice]
                
                # Reach allocated between 8 mins and 20 mins max range depending on hub
                r_time = random.uniform(8, 20)
                
                # radius = speed (km/h) * time (hours) * 1000 meters/km
                calculated_radius = t_speed * (r_time / 60.0) * 1000
            else:
                # Small-Fill hubs cover local blindspots only
                t_density = 'Dense Local (10 km/h)'
                t_speed = 10
                r_time = random.uniform(5, 10) # 5 to 10 mins
                calculated_radius = t_speed * (r_time / 60.0) * 1000
                
            # Confine radius strictly to reduce overlaps
            optimal_radius = min(calculated_radius, max_allowed_radius)
                
            buffer_poly = gpd.GeoSeries([pt], crs="EPSG:3857").buffer(optimal_radius).to_crs("EPSG:4326").iloc[0]
            
            isochrone_polys.append({
                "type": "Feature",
                "properties": {
                    "hub_id": int(row['Hub_ID']),
                    "hub_type": hub_type,
                    "traffic_density": t_density,
                    "reach_time_mins": round(r_time, 1),
                    "radius_meters": round(optimal_radius, 1)
                },
                "geometry": buffer_poly.__geo_interface__
            })
        except Exception as e:
            print(f"Failed processing hub {idx+1}: {e}")
            
    # Save as GeoJSON
    feature_collection = {
        "type": "FeatureCollection",
        "features": isochrone_polys
    }
    
    with open(output_file, "w") as f:
        json.dump(feature_collection, f)
        
    print(f"Generated 8-minute Isochrones and saved to {output_file}")
    return output_file

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")
    generate_isochrones()
