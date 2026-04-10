import pandas as pd
import numpy as np
from sklearn.cluster import KMeans

def optimize_locations(input_file='emergency_points.csv', output_file='hubs.csv'):
    df = pd.read_csv(input_file)
    
    # Extract coordinates and weights
    X = df[['Latitude', 'Longitude']].values
    weights = df['Weight'].values
    
    # Approach B: Centroid Seeding to prevent orphan remote zones.
    # We want exactly 20 hubs.
    # Let's actively select initial centers: 6 remote, 6 accident, 6 high-risk, 2 base.
    # This guarantees the KMeans algorithm starts with hubs near these important locations.
    
    def get_random_points(point_type, n):
        subset = df[df['Type'] == point_type]
        if len(subset) == 0: return []
        idx = np.random.choice(subset.index, min(n, len(subset)), replace=False)
        return subset.loc[idx, ['Latitude', 'Longitude']].values.tolist()
        
    init_centers = []
    init_centers.extend(get_random_points('Remote', 6))
    init_centers.extend(get_random_points('High-Risk', 6))
    init_centers.extend(get_random_points('Accident', 6))
    init_centers.extend(get_random_points('Base', 2))
    
    # Fill remaining if any subset was missing
    while len(init_centers) < 20:
        init_centers.extend(get_random_points('Base', 1))
        
    init_centers = np.array(init_centers[:20])

    # Run Weighted KMeans
    kmeans = KMeans(n_clusters=20, init=init_centers, n_init=1, max_iter=300, random_state=42)
    kmeans.fit(X, sample_weight=weights)
    
    primary_hubs = list(kmeans.cluster_centers_)
    
    # Find Empty Spots using greedy farthest point sampling (15 small-range hubs)
    from sklearn.metrics import pairwise_distances
    small_hubs = []
    current_centers = list(primary_hubs)
    for _ in range(15):
        dists = pairwise_distances(X, current_centers)
        min_dists = np.min(dists, axis=1)
        farthest_idx = np.argmax(min_dists)
        new_hub_pt = X[farthest_idx]
        small_hubs.append(new_hub_pt)
        current_centers.append(new_hub_pt)
        
    all_hubs = np.array(current_centers)
    hubs = pd.DataFrame(all_hubs, columns=['Latitude', 'Longitude'])
    hubs['Hub_ID'] = range(1, len(all_hubs) + 1)
    
    # Tag Hub Type separately
    hubs['Hub_Type'] = ['Primary'] * 20 + ['Small-Fill'] * 15
    
    hubs.to_csv(output_file, index=False)
    print(f"Generated 20 Primary and 15 Small-Fill Ambulance Hubs ({len(hubs)} total) and saved to {output_file}")
    
    # Save the labels back to the dataframe for later analysis if needed
    df['Hub_Assignment'] = kmeans.labels_
    df.to_csv(input_file, index=False)
    
    return output_file

if __name__ == "__main__":
    optimize_locations()
