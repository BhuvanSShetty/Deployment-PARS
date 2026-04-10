import agent_data
import agent_math
import agent_gis
import agent_ui

def main():
    print("=== Phase 1: Data Agent ===")
    agent_data.generate_data()
    
    print("\n=== Phase 2: Math/Optimization Agent ===")
    agent_math.optimize_locations()
    
    print("\n=== Phase 3: GIS Agent ===")
    print("This phase queries OpenStreetMap and may take a few minutes...")
    agent_gis.generate_isochrones()
    
    print("\n=== Phase 4: UI/Frontend Agent ===")
    agent_ui.generate_dashboard()
    
    print("\nSimulation complete. Open index.html to view the dashboard.")

if __name__ == "__main__":
    main()
