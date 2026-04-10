import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const mkAmb = (status, type) => L.divIcon({
  html: `<div style="background:${status === 'available' ? (type === 'ALS' ? '#185FA5' : '#3B6D11') : '#A32D2D'};width:18px;height:18px;border:2px solid #fff;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:700">${type === 'ALS' ? 'A' : 'B'}</div>`,
  className: '', iconSize: [18, 18], iconAnchor: [9, 9]
});

const mkFR = (status) => L.divIcon({
  html: `<div style="background:${status === 'responding' ? '#EF9F27' : '#534AB7'};width:12px;height:12px;border:2px solid #fff;border-radius:50%;${status === 'responding' ? 'box-shadow:0 0 0 3px rgba(239,159,39,0.3)' : ''}"></div>`,
  className: '', iconSize: [12, 12], iconAnchor: [6, 6]
});

const mkPatient = () => L.divIcon({
  html: `<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;width:20px;height:20px;border-radius:50%;border:2px solid #A32D2D;animation:pulse-ring 1.5s ease-out infinite;top:-4px;left:-4px;width:28px;height:28px;"></div><div style="background:#A32D2D;width:14px;height:14px;border-radius:50%;border:2px solid #fff;position:absolute;top:3px;left:3px;"></div></div>`,
  className: '', iconSize: [20, 20], iconAnchor: [10, 10]
});

const HeatLayer = ({ incidents }) => {
  const map = useMap();
  useEffect(() => {
    const pts = incidents
      .filter(i => i.location?.lat && i.location?.lng)
      .map(i => [i.location.lat, i.location.lng, 1.0]);
    if (!pts.length) return;
    const layer = L.heatLayer(pts, { radius: 30, blur: 20, gradient: { 0.3: '#3B6D11', 0.6: '#BA7517', 1.0: '#A32D2D' } }).addTo(map);
    return () => map.removeLayer(layer);
  }, [map, incidents]);
  return null;
};

// Keeps map always rendered but hides/shows layers per viewMode
const LiveMap = ({ viewMode, incidents = [], ambulances = [], firstResponders = [] }) => {
  const center = [12.9716, 77.5946];

  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%', minHeight: '340px' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* ── DEMAND HEATMAP ── */}
        {viewMode === 'heatmap' && <HeatLayer incidents={incidents} />}

        {/* ── AMBULANCE COVERAGE: 8km circles ── */}
        {viewMode === 'coverage' &&
          ambulances.filter(a => a.status === 'available' && a.currentLocation?.lat).map(amb => (
            <Circle
              key={`cov-${amb._id}`}
              center={[amb.currentLocation.lat, amb.currentLocation.lng]}
              radius={8000}
              pathOptions={{ color: '#185FA5', fillColor: '#185FA5', fillOpacity: 0.06, weight: 1, dashArray: '6 4' }}
            >
              <Popup><strong>{amb.ambulanceId}</strong><br />8km coverage zone</Popup>
            </Circle>
          ))
        }

        {/* ── LIVE MAP: all entity markers ── */}
        {viewMode === 'live' && (
          <>
            {incidents.filter(i => i.location?.lat).map(inc => (
              <Marker key={`inc-${inc._id}`} position={[inc.location.lat, inc.location.lng]} icon={mkPatient()}>
                <Popup><strong>{inc.chiefComplaint}</strong><br />Priority: {inc.priority}</Popup>
              </Marker>
            ))}
            {ambulances.filter(a => a.currentLocation?.lat).map(amb => (
              <Marker key={`amb-${amb._id}`} position={[amb.currentLocation.lat, amb.currentLocation.lng]} icon={mkAmb(amb.status, amb.serviceLevel)}>
                <Popup><strong>{amb.ambulanceId}</strong><br />{amb.serviceLevel} · {amb.status}</Popup>
              </Marker>
            ))}
            {firstResponders.filter(fr => fr.currentLocation?.coordinates).map(fr => {
              const [lng, lat] = fr.currentLocation.coordinates;
              return (
                <Marker key={`fr-${fr._id}`} position={[lat, lng]} icon={mkFR(fr.status)}>
                  <Popup><strong>{fr.name}</strong><br />{fr.role} · {fr.status}</Popup>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>
    </>
  );
};

export default LiveMap;
