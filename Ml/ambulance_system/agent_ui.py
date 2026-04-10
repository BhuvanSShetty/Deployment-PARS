import folium
from folium.plugins import HeatMap
import pandas as pd
import json
import requests
import time
import os

def reverse_geocode(lat, lon):
    url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}"
    headers = {"User-Agent": "pars_ambulance_v1"}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            # return short address (display_name can be long, so taking parts)
            display_name = data.get('display_name', f"Location at {lat:.4f}, {lon:.4f}")
            parts = display_name.split(', ')
            return ", ".join(parts[:3]) if len(parts) >= 3 else display_name
    except Exception as e:
        pass
    return f"Location at {lat:.4f}, {lon:.4f}"

def generate_dashboard(points_file='emergency_points.csv', isochrones_file='isochrones.geojson', output_html='index.html'):
    # Base Map centered on Bengaluru
    m = folium.Map(location=[12.9716, 77.5946], zoom_start=11, tiles="CartoDB dark_matter")
    
    # Heatmap Layer
    df = pd.read_csv(points_file)
    heat_data = [[row['Latitude'], row['Longitude'], row['Weight']] for index, row in df.iterrows()]
    
    heatmap = HeatMap(heat_data, radius=12, max_zoom=13, blur=15, name="Risk Heatmap", show=True)
    m.add_child(heatmap)
    
    # Coverage Polygons Layer (Isochrones)
    try:
        with open(isochrones_file, 'r') as f:
            isochrone_data = json.load(f)
            
        def style_function(feature):
            props = feature.get('properties', {})
            h_type = props.get('hub_type', 'Primary')
            t_density = props.get('traffic_density', '')
            
            color = '#00ff00' # default green
            if h_type == 'Small-Fill':
                color = '#4287f5' # blue
            elif 'Heavy' in t_density:
                color = '#f54242' # red
            elif 'Moderate' in t_density:
                color = '#f5e342' # yellow
                
            return {
                'fillColor': color,
                'color': color,
                'weight': 2,
                'fillOpacity': 0.3
            }
        
        tooltip = folium.GeoJsonTooltip(
            fields=['hub_id', 'hub_type', 'traffic_density', 'reach_time_mins', 'radius_meters'],
            aliases=['Hub ID:', 'Type:', 'Assumed Traffic:', 'Reach Limit (mins):', 'Coverage Radius (m):'],
            localize=True,
            sticky=False,
            labels=True,
            style="""
                background-color: #F0EFEF;
                border: 2px solid black;
                border-radius: 3px;
                box-shadow: 3px 3px rgba(0,0,0,0.25);
                font-family: sans-serif;
            """,
            max_width=400,
        )
        
        folium.GeoJson(
            isochrone_data,
            name="Traffic-Adjusted Coverage",
            style_function=style_function,
            tooltip=tooltip
        ).add_to(m)
        
        # Injected JS for dynamic map translation
        translation_js = """
        <script>
        const translations = {
            'en': {
                'Hub ID:': 'Hub ID:',
                'Type:': 'Type:',
                'Assumed Traffic:': 'Assumed Traffic:',
                'Reach Limit (mins):': 'Reach Limit (mins):',
                'Coverage Radius (m):': 'Coverage Radius (m):',
                'Primary': 'Primary',
                'Small-Fill': 'Small-Fill',
                'Light': 'Light',
                'Moderate': 'Moderate',
                'Heavy': 'Heavy'
            },
            'kn': {
                'Hub ID:': 'ಹಬ್ ಐಡಿ (Hub ID):',
                'Type:': 'ಪ್ರಕಾರ (Type):',
                'Assumed Traffic:': 'ಊಹಿಸಲಾದ ಸಂಚಾರ:',
                'Reach Limit (mins):': 'ತಲುಪುವ ಮಿತಿ (ನಿಮಿಷಗಳು):',
                'Coverage Radius (m):': 'ವ್ಯಾಪ್ತಿಯ ತ್ರಿಜ್ಯ (ಮೀ):',
                'Primary': 'ಪ್ರಾಥಮಿಕ',
                'Small-Fill': 'ಸಣ್ಣ-ಭರ್ತಿ',
                'Light': 'ಕಡಿಮೆ',
                'Moderate': 'ಮಧ್ಯಮ',
                'Heavy': 'ಹೆಚ್ಚು'
            },
            'hi': {
                'Hub ID:': 'हब आईडी:',
                'Type:': 'प्रकार:',
                'Assumed Traffic:': 'अनुमानित ट्रैफ़िक:',
                'Reach Limit (mins):': 'पहुँच सीमा (मिनट):',
                'Coverage Radius (m):': 'कवरेज त्रिज्या (मीटर):',
                'Primary': 'प्राथमिक',
                'Small-Fill': 'स्मॉल-फिल',
                'Light': 'हल्का',
                'Moderate': 'मध्यम',
                'Heavy': 'भारी'
            }
        };

        window.addEventListener('message', function(event) {
            if (event.data.type === 'SET_LANGUAGE') {
                const lang = event.data.lang;
                const dict = translations[lang] || translations['en'];
                
                // This is a simplified approach, real Folium tooltips are dynamic
                // We'll add a mutation observer to catch tooltips as they appear
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.classList && (node.classList.contains('leaflet-tooltip') || node.classList.contains('leaflet-popup'))) {
                                let content = node.innerHTML;
                                Object.keys(dict).forEach(key => {
                                    const regex = new RegExp(key, 'g');
                                    content = content.replace(regex, dict[key]);
                                });
                                node.innerHTML = content;
                            }
                        });
                    });
                });
                observer.observe(document.body, { childList: true, subtree: true });
                window.currentLang = lang;
            }
        });
        </script>
        """
        m.get_root().html.add_child(folium.Element(translation_js))
        
    except FileNotFoundError:
        print(f"Warning: {isochrones_file} not found. Polygons will not be shown.")
        
    # Ambulance Hubs Markers
    try:
        hubs = pd.read_csv('hubs.csv')
        hubs_layer = folium.FeatureGroup(name="Ambulance Hubs")
        for index, row in hubs.iterrows():
            hub_id = int(row['Hub_ID'])
            amb_id = f"amb-{hub_id:03d}"
            plate_num = f"KA-{hub_id % 70 + 1:02d}-AM-{hub_id * 1111 % 10000:04d}"
            lat, lon = row['Latitude'], row['Longitude']
            
            place_name = reverse_geocode(lat, lon)
            time.sleep(1) # sleep to respect Nominatim API terms
            
            hub_type = row.get('Hub_Type', 'Primary')
            icon_color = 'blue' if hub_type == 'Small-Fill' else 'red'
            icon_name = 'plus-square' if hub_type == 'Small-Fill' else 'ambulance'
            
            popup_html = f"<b>ID:</b> {amb_id}<br><b>Type:</b> {hub_type}<br><b>Plate:</b> {plate_num}<br><b>Place:</b> {place_name}<br><b>Coordinates:</b> {lat:.4f}, {lon:.4f}"
            
            folium.Marker(
                location=[lat, lon],
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=f"{amb_id} | {hub_type} | {place_name}",
                icon=folium.Icon(color=icon_color, icon=icon_name, prefix='fa')
            ).add_to(hubs_layer)
        hubs_layer.add_to(m)
    except FileNotFoundError:
        print("Warning: hubs.csv not found.")
        
    # Highest Risk Verification Layer
    try:
        top_50 = df.nlargest(50, 'Weight')
        h_layer = folium.FeatureGroup(name="Top 50 Risk Points")
        for index, row in top_50.iterrows():
            folium.CircleMarker(
                location=[row['Latitude'], row['Longitude']],
                radius=3,
                color='yellow',
                fill=True,
                popup=f"Risk:{row['Weight']}"
            ).add_to(h_layer)
        h_layer.add_to(m)
    except Exception as e:
        print(f"Warning: could not add top 50 risk points layer. {e}")
        
    # Add layer control to toggle on/off
    folium.LayerControl().add_to(m)
    
    m.save(output_html)
    print(f"Dashboard generated at {output_html}")
    return output_html

if __name__ == "__main__":
    out_file = os.getenv('OUTPUT_PATH', 'index.html')
    generate_dashboard(output_html=out_file)
