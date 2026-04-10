import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import LiveMap from '../components/LiveMap';
import '../styles/DispatcherPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

/* ─── ChainCare Dispatcher styles (ported 1:1 from dispatcher_full_window.html) ─── */
const S = `
:root {
  --cc-bg: #ffffff;
  --cc-bg2: #f9fafb;
  --cc-border: #e5e7eb;
  --cc-border2: #d1d5db;
  --cc-border3: #f3f4f6;
  --cc-text: #111827;
  --cc-text2: #6b7280;
  --cc-radius: 10px;
  --cc-radius-sm: 6px;
}
.cc-wrap { padding: 0; font-family: system-ui,-apple-system,sans-serif; }
.cc-topbar { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--cc-border);border-radius:var(--cc-radius) var(--cc-radius) 0 0;background:var(--cc-bg);border-bottom:none; }
.cc-tb-left { display:flex;align-items:center;gap:12px; }
.cc-logo { font-size:14px;font-weight:500;color:var(--cc-text); }
.cc-badge { font-size:11px;color:var(--cc-text2);background:var(--cc-bg2);padding:3px 10px;border-radius:20px;border:1px solid var(--cc-border); }
.cc-live-dot { width:7px;height:7px;border-radius:50%;background:#3B6D11;display:inline-block;margin-right:5px; }
.cc-tb-right { display:flex;align-items:center;gap:8px;font-size:11px;color:var(--cc-text2); }
.cc-pill { padding:3px 10px;border-radius:20px;border:1px solid var(--cc-border);background:var(--cc-bg2);font-size:11px; }
.cc-layout { display:grid;grid-template-columns:1fr 340px;border:1px solid var(--cc-border);border-radius:0 0 var(--cc-radius) var(--cc-radius);overflow:hidden;min-height:540px; }
.cc-map-area { background:var(--cc-bg2);position:relative;overflow:hidden;border-right:1px solid var(--cc-border);display:flex;flex-direction:column; }
.cc-tab-row { display:flex;border-bottom:1px solid var(--cc-border);background:var(--cc-bg);flex-shrink:0; }
.cc-mt { flex:1;padding:7px 8px;text-align:center;font-size:11px;cursor:pointer;border-right:1px solid var(--cc-border);color:var(--cc-text2);background:var(--cc-bg2);transition:all .15s;user-select:none; }
.cc-mt:last-child { border-right:none; }
.cc-mt.on { background:var(--cc-bg);color:var(--cc-text);font-weight:500; }
.cc-map-body { flex:1;position:relative;overflow:hidden; }
.cc-map-legend { display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-top:1px solid var(--cc-border3);background:var(--cc-bg); }
.cc-leg-item { display:flex;align-items:center;gap:5px;font-size:10px;color:var(--cc-text2); }
.cc-leg-dot { width:8px;height:8px;border-radius:50%; }
.cc-leg-sq { width:8px;height:8px;border-radius:2px; }
.cc-sidebar { background:var(--cc-bg);display:flex;flex-direction:column;overflow:hidden; }
.cc-side-tabs { display:flex;border-bottom:1px solid var(--cc-border);flex-shrink:0; }
.cc-st { flex:1;padding:9px 6px;text-align:center;font-size:10px;cursor:pointer;color:var(--cc-text2);border-right:1px solid var(--cc-border);background:var(--cc-bg2);line-height:1.4;transition:all .15s;user-select:none; }
.cc-st:last-child { border-right:none; }
.cc-st.on { background:var(--cc-bg);color:var(--cc-text);font-weight:500; }
.cc-side-body { padding:12px;overflow-y:auto;flex:1;max-height:460px; }
.cc-spane { display:none; }
.cc-spane.on { display:block; }
.cc-sec { font-size:10px;font-weight:500;color:var(--cc-text2);text-transform:uppercase;letter-spacing:.4px;margin:10px 0 6px; }
.cc-sec:first-child { margin-top:0; }
.cc-card { background:var(--cc-bg2);border-radius:var(--cc-radius-sm);padding:10px 12px;margin-bottom:8px;border:1px solid var(--cc-border); }
.cc-card-title { font-size:12px;font-weight:500;color:var(--cc-text);margin-bottom:4px; }
.cc-card-sub { font-size:11px;color:var(--cc-text2);line-height:1.5; }
.cc-alert { border-radius:var(--cc-radius-sm);padding:8px 11px;font-size:11px;line-height:1.5;margin-bottom:8px; }
.cc-al-r { background:#fcebeb;color:#791f1f;border-left:3px solid #A32D2D; }
.cc-al-g { background:#eaf3de;color:#27500a;border-left:3px solid #3B6D11; }
.cc-al-b { background:#E6F1FB;color:#0C447C;border-left:3px solid #185FA5; }
.cc-al-a { background:#faeeda;color:#633806;border-left:3px solid #BA7517; }
.cc-al-p { background:#EEEDFE;color:#3C3489;border-left:3px solid #534AB7; }
.cc-fr-row { display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--cc-border3); }
.cc-fr-row:last-child { border-bottom:none; }
.cc-fr-av { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;flex-shrink:0; }
.cc-fa-avail { background:#EEEDFE;color:#3C3489; }
.cc-fa-resp { background:#faeeda;color:#633806; }
.cc-fr-info { flex:1; }
.cc-fr-name { font-size:12px;font-weight:500;color:var(--cc-text); }
.cc-fr-detail { font-size:10px;color:var(--cc-text2);margin-top:1px; }
.cc-fr-status { font-size:10px;padding:2px 7px;border-radius:20px; }
.cc-fs-avail { background:#eaf3de;color:#27500a; }
.cc-fs-resp { background:#faeeda;color:#633806; }
.cc-fs-off { background:var(--cc-bg2);color:var(--cc-text2);border:1px solid var(--cc-border); }
.cc-btn { width:100%;padding:8px;border-radius:var(--cc-radius-sm);border:none;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;margin-top:4px; }
.cc-btn-primary { background:#111827;color:#fff; }
.cc-btn-sec { background:var(--cc-bg2);color:var(--cc-text);border:1px solid var(--cc-border); }
.cc-amb-row { display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--cc-border3); }
.cc-amb-row:last-child { border-bottom:none; }
.cc-amb-icon { width:28px;height:28px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;flex-shrink:0; }
.cc-ai-als { background:#E6F1FB;color:#0C447C; }
.cc-ai-bls { background:#eaf3de;color:#27500a; }
.cc-ai-busy { background:#fcebeb;color:#791f1f; }
.cc-amb-info { flex:1; }
.cc-amb-id { font-size:12px;font-weight:500;color:var(--cc-text); }
.cc-amb-loc { font-size:10px;color:var(--cc-text2);margin-top:1px; }
.cc-amb-status { font-size:10px;padding:2px 7px;border-radius:20px; }
.cc-as-free { background:#eaf3de;color:#27500a; }
.cc-as-busy { background:#fcebeb;color:#791f1f; }
.cc-as-ret { background:#faeeda;color:#633806; }
.cc-case-row { display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--cc-border3);cursor:pointer; }
.cc-case-row:last-child { border-bottom:none; }
.cc-case-score { width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0; }
.cc-cs-crit { background:#fcebeb;color:#791f1f; }
.cc-cs-mod { background:#faeeda;color:#633806; }
.cc-cs-low { background:#eaf3de;color:#27500a; }
.cc-case-info { flex:1; }
.cc-case-title { font-size:12px;font-weight:500;color:var(--cc-text); }
.cc-case-sub { font-size:10px;color:var(--cc-text2);margin-top:1px; }
.cc-case-eta { font-size:10px;color:var(--cc-text2);text-align:right; }
.cc-lbl { font-size:10px;font-weight:500;color:var(--cc-text2);margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:.3px; }
.cc-val-box { min-height:30px;border:1px solid var(--cc-border);border-radius:var(--cc-radius-sm);padding:6px 9px;font-size:11px;color:var(--cc-text);background:var(--cc-bg);display:flex;align-items:center;margin-bottom:8px;word-break:break-word; }
.cc-chip-row { display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px; }
.cc-chip { font-size:10px;padding:4px 8px;border-radius:20px;border:1px solid var(--cc-border);background:var(--cc-bg2);color:var(--cc-text2);cursor:pointer;transition:all .1s; }
.cc-chip.sel { background:#E6F1FB;border-color:#185FA5;color:#0C447C; }
.cc-chip.sel-r { background:#fcebeb;border-color:#A32D2D;color:#791f1f; }
.cc-g2 { display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px; }
.cc-risk-box { border-radius:var(--cc-radius-sm);padding:9px 11px;margin:8px 0;border:1px solid #A32D2D;background:#fcebeb; }
.cc-risk-score { font-size:22px;font-weight:500;color:#A32D2D; }
.cc-risk-label { font-size:10px;color:#791f1f;margin-top:2px; }
.cc-disp-box { background:var(--cc-bg2);border-radius:var(--cc-radius-sm);padding:9px 11px;margin:8px 0;border:1px solid var(--cc-border); }
.cc-db-title { font-size:11px;font-weight:500;color:var(--cc-text);margin-bottom:4px; }
.cc-db-row { display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:3px; }
.cc-db-label { color:var(--cc-text2); }
.cc-db-val { font-weight:500;color:var(--cc-text); }
`;

/* ── helpers ── */
const HIGH_RISK_KEYWORDS = ['cardiac', 'arrest', 'heart', 'unconscious', 'stemi', 'chest'];
const isHighRisk = (incident) =>
  incident.priority === 'HIGH' ||
  HIGH_RISK_KEYWORDS.some(k => incident.chiefComplaint?.toLowerCase().includes(k)) ||
  incident.symptoms?.some(s => HIGH_RISK_KEYWORDS.some(k => s.toLowerCase().includes(k)));

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const DispatcherPage = () => {
  const { t, i18n } = useTranslation();
  const [incidents, setIncidents]           = useState([]);
  const [ambulances, setAmbulances]         = useState([]);
  const [firstResponders, setFirstResponders] = useState([]);
  const [viewMode, setViewMode]             = useState('live');
  const [sideTab, setSideTab]               = useState('new');
  const [connectionStatus, setConnectionStatus] = useState('Polling');
  const [error, setError]                   = useState('');

  /* ── WebSocket ── */
  useEffect(() => {
    const sock = io(SOCKET_URL);
    sock.on('connect',    () => setConnectionStatus('Connected'));
    sock.on('disconnect', () => setConnectionStatus('Disconnected'));
    sock.on('incidentStatusUpdate', inc =>
      setIncidents(prev => prev.map(i => i._id === inc._id ? inc : i)));
    sock.on('firstResponderAccepted', inc => {
      setIncidents(prev => prev.map(i => i._id === inc._id ? inc : i));
      if (inc.location) fetchFRs(inc.location.lat, inc.location.lng);
    });
    return () => sock.close();
  }, []);

  /* ── Polling ── */
  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      try {
        const r = await fetch(`${API_BASE_URL}/api/dispatch/queue`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setIncidents(await r.json()); else setError('Failed to load queue');
      } catch { setError('Failed to load queue'); }
      try {
        const r = await fetch(`${API_BASE_URL}/api/ambulances/available`);
        if (r.ok) setAmbulances(await r.json());
      } catch {}
    };
    load();
    fetchFRs(12.9716, 77.5946, 15000);
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const fetchFRs = async (lat, lng, radius = 1000) => {
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`${API_BASE_URL}/api/dispatch/check-first-responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat, lng, radius })
      });
      if (r.ok) { const data = await r.json(); setFirstResponders(data); return data; }
    } catch {} return [];
  };

  const handleAssign = async (incidentId, formState) => {
    setError('');
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`${API_BASE_URL}/api/dispatch/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ incidentId, ...formState })
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Unable to assign'); }
      else setIncidents(prev => prev.filter(i => i._id !== incidentId));
    } catch { setError('Unable to assign'); }
  };

  const unassigned = incidents.filter(i => i.status === 'new');
  const activeCase = unassigned[0] || null;
  const activeIncidents = incidents.filter(i => i.status !== 'new');
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const mapLegendsLive = (
    <div className="cc-map-legend">
      <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#A32D2D' }}></div>Patient</div>
      <div className="cc-leg-item"><div className="cc-leg-sq" style={{ background: '#185FA5', borderRadius: '2px' }}></div>ALS</div>
      <div className="cc-leg-item"><div className="cc-leg-sq" style={{ background: '#3B6D11', borderRadius: '2px' }}></div>BLS</div>
      <div className="cc-leg-item"><div className="cc-leg-sq" style={{ background: '#A32D2D', borderRadius: '2px' }}></div>Busy</div>
      <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#534AB7' }}></div>FR available</div>
      <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#EF9F27' }}></div>FR responding</div>
    </div>
  );

  const mapLegendsHeat = (
    <>
      <div className="cc-alert cc-al-b" style={{ margin: '0 12px 0', fontSize: '10px' }}>
        Heatmap from 90-day 108 call data. Red = high demand. Ambulances pre-positioned to red zones at peak hours.
      </div>
      <div className="cc-map-legend">
        <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#A32D2D' }}></div>High demand</div>
        <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#BA7517' }}></div>Moderate</div>
        <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#3B6D11' }}></div>Low demand</div>
      </div>
    </>
  );

  const mapLegendsCoverage = (
    <>
      <div className="cc-alert cc-al-a" style={{ margin: '0 12px 0', fontSize: '10px' }}>
        Coverage gap detected: Jayanagar south has no ambulance within 8km. Recommend repositioning BLS from Banashankari.
      </div>
      <div className="cc-map-legend">
        <div className="cc-leg-item"><div className="cc-leg-dot" style={{ background: '#185FA5' }}></div>8km coverage per ambulance</div>
      </div>
    </>
  );

  return (
    <div className="dispatcher-page">
      <style>{S}</style>

      {/* ── Header ── */}
      <header className="dispatcher-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>{t('console_title')}</h1>
          <p>{t('console_subtitle')}</p>
        </div>
        <div className={`connection-status ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
          {connectionStatus}
        </div>
      </header>

      {error && <div className="dispatcher-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* ── Ambulance Pre-positioning Map (original ML map, kept) ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px', color: '#111827' }}>
          Ambulance Pre-positioning &amp; Gap Analysis
        </h2>
        <iframe
          src="/ambulance_map.html"
          title="Ambulance Pre-positioning Map"
          style={{ width: '100%', height: '480px', border: 'none', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
      </div>

      {/* ══ ChainCare Dispatcher Panel ══ */}
      <div className="cc-wrap">

        {/* Topbar */}
        <div className="cc-topbar">
          <div className="cc-tb-left">
            <div className="cc-logo">ChainCare — Dispatch</div>
            <div className="cc-badge"><span className="cc-live-dot"></span>Live · Bengaluru South Zone</div>
          </div>
          <div className="cc-tb-right">
            <div className="cc-pill" style={{ color: '#A32D2D', borderColor: '#A32D2D' }}>{unassigned.length + activeIncidents.length} active cases</div>
            <div className="cc-pill">{ambulances.length} ambulances</div>
            <div className="cc-pill" style={{ color: '#534AB7', borderColor: '#534AB7' }}>{firstResponders.length} first responders</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>{now}</div>
          </div>
        </div>

        {/* Main grid: map | sidebar */}
        <div className="cc-layout">

          {/* ── LEFT: Map Area ── */}
          <div className="cc-map-area">
            <div className="cc-tab-row">
              <div className={`cc-mt ${viewMode === 'live' ? 'on' : ''}`} onClick={() => setViewMode('live')}>Live map</div>
              <div className={`cc-mt ${viewMode === 'heatmap' ? 'on' : ''}`} onClick={() => setViewMode('heatmap')}>Demand heatmap</div>
              <div className={`cc-mt ${viewMode === 'coverage' ? 'on' : ''}`} onClick={() => setViewMode('coverage')}>Ambulance coverage</div>
            </div>
            <div className="cc-map-body">
              <LiveMap viewMode={viewMode} incidents={incidents} ambulances={ambulances} firstResponders={firstResponders} />
            </div>
            {viewMode === 'live' && mapLegendsLive}
            {viewMode === 'heatmap' && mapLegendsHeat}
            {viewMode === 'coverage' && mapLegendsCoverage}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="cc-sidebar">
            <div className="cc-side-tabs">
              <div className={`cc-st ${sideTab === 'new' ? 'on' : ''}`} onClick={() => setSideTab('new')}>New case</div>
              <div className={`cc-st ${sideTab === 'fr' ? 'on' : ''}`} onClick={() => setSideTab('fr')}>First responders</div>
              <div className={`cc-st ${sideTab === 'fleet' ? 'on' : ''}`} onClick={() => setSideTab('fleet')}>Fleet</div>
              <div className={`cc-st ${sideTab === 'active' ? 'on' : ''}`} onClick={() => setSideTab('active')}>Active</div>
            </div>

            <div className="cc-side-body">

              {/* ── New Case ── */}
              <div className={`cc-spane ${sideTab === 'new' ? 'on' : ''}`}>
                {activeCase
                  ? <NewCasePanel incident={activeCase} ambulances={ambulances} onAssign={handleAssign} onSwitchToFR={() => setSideTab('fr')} />
                  : <div style={{ color: '#6b7280', textAlign: 'center', marginTop: '24px', fontSize: '11px' }}>No unassigned cases in queue.</div>
                }
              </div>

              {/* ── First Responders ── */}
              <div className={`cc-spane ${sideTab === 'fr' ? 'on' : ''}`}>
                <div className="cc-alert cc-al-p">First responders within 1km of patient · Pinged automatically on dispatch</div>
                
                <div className="cc-sec">Responding</div>
                {firstResponders.filter(f => f.status === 'responding').length === 0
                  ? <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>None responding currently.</div>
                  : firstResponders.filter(f => f.status === 'responding').map(fr => (
                    <div className="cc-fr-row" key={fr._id}>
                      <div className="cc-fr-av cc-fa-resp">{initials(fr.name)}</div>
                      <div className="cc-fr-info">
                        <div className="cc-fr-name">{fr.name}</div>
                        <div className="cc-fr-detail">{fr.role} · ETA ~5 min</div>
                      </div>
                      <div className="cc-fr-status cc-fs-resp">Responding</div>
                    </div>
                  ))
                }

                <div className="cc-sec">Available nearby</div>
                {firstResponders.filter(f => f.status === 'available').length === 0
                  ? <div style={{ fontSize: '10px', color: '#888', marginBottom: '6px' }}>No responders available.</div>
                  : firstResponders.filter(f => f.status === 'available').map(fr => (
                    <div className="cc-fr-row" key={fr._id}>
                      <div className="cc-fr-av cc-fa-avail">{initials(fr.name)}</div>
                      <div className="cc-fr-info">
                        <div className="cc-fr-name">{fr.name}</div>
                        <div className="cc-fr-detail">{fr.role}{fr.carriesKit ? ' · Carries defib kit' : ''}</div>
                      </div>
                      <div className="cc-fr-status cc-fs-avail">Available</div>
                    </div>
                  ))
                }

                <div className="cc-sec" style={{ marginTop: '12px' }}>What first responders receive</div>
                <div className="cc-card">
                  <div className="cc-card-title">Push notification sent</div>
                  <div className="cc-card-sub" style={{ background: '#fff', borderRadius: '6px', padding: '8px', marginTop: '6px', border: '1px solid #e5e7eb', fontSize: '11px', lineHeight: '1.6' }}>
                    EMERGENCY NEARBY — 0.4km<br />
                    58M · Chest pain · Suspected cardiac<br />
                    <strong>Tap RESPOND to accept</strong><br />
                    Ambulance ETA: 8 min<br />
                    Patient location: Maps link
                  </div>
                </div>
                <div className="cc-card">
                  <div className="cc-card-title">First responder rules</div>
                  <div className="cc-card-sub">Only pinged for cardiac arrest, unconscious, or risk score above 65. Not dispatched for low-risk cases. Responders can decline with one tap — no obligation. Liability covered by the system operator.</div>
                </div>
              </div>

              {/* ── Fleet ── */}
              <div className={`cc-spane ${sideTab === 'fleet' ? 'on' : ''}`}>
                <div className="cc-alert cc-al-b" style={{ fontSize: '11px' }}>Ambulances pre-positioned to high demand zones from heatmap. Coverage view shows gaps.</div>
                
                <div className="cc-sec">Available</div>
                {ambulances.filter(a => a.status === 'available').map(amb => (
                  <div className="cc-amb-row" key={amb._id}>
                    <div className={`cc-amb-icon ${amb.serviceLevel === 'ALS' ? 'cc-ai-als' : 'cc-ai-bls'}`}>{amb.serviceLevel}</div>
                    <div className="cc-amb-info">
                      <div className="cc-amb-id">{amb.ambulanceId}</div>
                      <div className="cc-amb-loc">{amb.numberPlate}</div>
                    </div>
                    <div className="cc-amb-status cc-as-free">Free</div>
                  </div>
                ))}
                {ambulances.filter(a => a.status === 'available').length === 0 && (
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>No available units.</div>
                )}

                <div className="cc-sec">En route / Busy</div>
                {ambulances.filter(a => a.status !== 'available').map(amb => (
                  <div className="cc-amb-row" key={amb._id}>
                    <div className="cc-amb-icon cc-ai-busy">!</div>
                    <div className="cc-amb-info">
                      <div className="cc-amb-id">{amb.ambulanceId}</div>
                      <div className="cc-amb-loc">{amb.status}</div>
                    </div>
                    <div className="cc-amb-status cc-as-busy">Busy</div>
                  </div>
                ))}
                {ambulances.filter(a => a.status !== 'available').length === 0 && (
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>No busy units.</div>
                )}

                <div className="cc-alert cc-al-a" style={{ marginTop: '8px', fontSize: '11px' }}>
                  Coverage gap: Jayanagar south uncovered. Reposition KA-01-IJ-7890 on return?
                </div>
                <button className="cc-btn cc-btn-sec">Reposition to Jayanagar</button>
              </div>

              {/* ── Active Cases ── */}
              <div className={`cc-spane ${sideTab === 'active' ? 'on' : ''}`}>
                <div className="cc-sec">Active cases — sorted by priority</div>
                {activeIncidents.length === 0 && (
                  <div style={{ fontSize: '10px', color: '#888' }}>No active cases currently.</div>
                )}
                {activeIncidents.map(inc => (
                  <div className="cc-case-row" key={inc._id}>
                    <div className={`cc-case-score ${inc.priority === 'HIGH' ? 'cc-cs-crit' : inc.priority === 'MEDIUM' ? 'cc-cs-mod' : 'cc-cs-low'}`}>
                      {inc.priority === 'HIGH' ? '74' : inc.priority === 'MEDIUM' ? '52' : '28'}
                    </div>
                    <div className="cc-case-info">
                      <div className="cc-case-title">{inc.patientName || 'Patient'} · {inc.chiefComplaint}</div>
                      <div className="cc-case-sub">{inc.firstResponderAssigned ? 'FR responding' : inc.status}</div>
                    </div>
                    <div className="cc-case-eta">
                      11 min<br />
                      <span style={{ color: inc.priority === 'HIGH' ? '#A32D2D' : '#3B6D11', fontSize: '10px' }}>
                        {inc.priority === 'HIGH' ? '↑ worsening' : '→ stable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   NEW CASE PANEL — the dispatcher's primary action pane
══════════════════════════════════════════════════════════════ */
const NewCasePanel = ({ incident, ambulances, onAssign, onSwitchToFR }) => {
  const [nearbyFRs, setNearbyFRs] = useState([]);
  const [priority, setPriority]   = useState(incident.priority || 'HIGH');
  const [ambType, setAmbType]     = useState('ALS');
  const [ambId, setAmbId]         = useState('');
  const critical = isHighRisk(incident);

  useEffect(() => {
    if (critical && incident.location?.lat) {
      (async () => {
        const token = localStorage.getItem('token');
        try {
          const r = await fetch(`${API_BASE_URL}/api/dispatch/check-first-responders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat: incident.location.lat, lng: incident.location.lng, radius: 1000 })
          });
          if (r.ok) setNearbyFRs(await r.json());
        } catch {}
      })();
    }
  }, [incident, critical]);

  const cc = incident.chiefComplaint?.toLowerCase() || '';
  const chipSel = (word) => cc.includes(word) ? 'cc-chip sel-r' : 'cc-chip';
  const noKnown = !['chest', 'trauma', 'stroke', 'unconscious'].some(w => cc.includes(w));

  const dispatchAndPing = () => {
    onAssign(incident._id, { priority, ambulanceType: ambType, ambulanceId: ambId, dispatcherNotes: '', pingFirstResponders: true });
    onSwitchToFR();
  };
  const dispatchOnly = () => {
    onAssign(incident._id, { priority, ambulanceType: ambType, ambulanceId: ambId, dispatcherNotes: '', pingFirstResponders: false });
  };

  const availAmbs = ambulances.filter(a => a.status === 'available');
  const bestAmb = availAmbs.find(a => a.serviceLevel === ambType) || availAmbs[0];

  return (
    <div>
      <div className="cc-sec">Patient details</div>
      <div className="cc-g2">
        <div>
          <span className="cc-lbl">Age</span>
          <div className="cc-val-box">{incident.patientAge || '—'}</div>
        </div>
        <div>
          <span className="cc-lbl">Sex</span>
          <div className="cc-chip-row">
            <div className="cc-chip sel">M</div>
            <div className="cc-chip">F</div>
          </div>
        </div>
      </div>

      <span className="cc-lbl">Chief complaint</span>
      <div className="cc-chip-row">
        <div className={chipSel('chest')}>Chest pain</div>
        <div className={chipSel('trauma')}>Trauma</div>
        <div className={chipSel('stroke')}>Stroke</div>
        <div className={chipSel('unconscious')}>Unconscious</div>
        <div className="cc-chip">Breathing</div>
        <div className={`cc-chip${noKnown ? ' sel' : ''}`}>Other</div>
      </div>

      <span className="cc-lbl">Mechanism (if trauma)</span>
      <div className="cc-chip-row">
        <div className="cc-chip">MVA high</div>
        <div className="cc-chip">MVA low</div>
        <div className="cc-chip">Fall</div>
        <div className="cc-chip">Penetrating</div>
        <div className="cc-chip">N/A</div>
      </div>

      <span className="cc-lbl">Known conditions</span>
      <div className="cc-chip-row">
        <div className="cc-chip sel">Hypertension</div>
        <div className="cc-chip">Diabetes</div>
        <div className={`cc-chip${critical ? ' sel' : ''}`}>Cardiac</div>
        <div className="cc-chip">None</div>
      </div>

      <span className="cc-lbl">Caller symptoms (free text)</span>
      <div className="cc-val-box" style={{ minHeight: '44px', alignItems: 'flex-start', paddingTop: '6px', fontSize: '11px', color: '#6b7280' }}>
        {incident.symptoms?.join(', ') || incident.chiefComplaint || 'Chest pain to left arm, sweating badly...'}
      </div>

      {critical && (
        <div className="cc-risk-box">
          <div className="cc-risk-score">74 <span style={{ fontSize: '13px' }}>HIGH RISK</span></div>
          <div className="cc-risk-label">Suspected STEMI · Trauma Level 2 · Recommend ALS</div>
        </div>
      )}

      <div className="cc-disp-box">
        <div className="cc-db-title">Dispatch recommendation</div>
        <div className="cc-db-row">
          <span className="cc-db-label">Ambulance</span>
          <span className="cc-db-val" style={{ color: '#185FA5' }}>
            {bestAmb ? `${bestAmb.ambulanceId} (${bestAmb.serviceLevel})` : 'KA-01-AB-1234 (ALS)'}
          </span>
        </div>
        <div className="cc-db-row"><span className="cc-db-label">Hospital</span><span className="cc-db-val">Fortis Bannerghatta</span></div>
        <div className="cc-db-row"><span className="cc-db-label">ETA to patient</span><span className="cc-db-val">8 min</span></div>
        <div className="cc-db-row"><span className="cc-db-label">ETA to hospital</span><span className="cc-db-val">11 min</span></div>
      </div>

      {/* ── Purple FR banner — appears automatically ── */}
      {critical && nearbyFRs.length > 0 && (
        <div className="cc-alert cc-al-p">
          <strong>{nearbyFRs.length} first responders nearby</strong><br />
          {nearbyFRs.slice(0, 2).map((fr, i) => (
            <span key={fr._id}>{fr.name} ({fr.role}){i < nearbyFRs.length - 1 ? ' · ' : ''}</span>
          ))}
        </div>
      )}

      {/* ── Post-dispatch: FR accepted banner ── */}
      {incident.firstResponderAssigned && (
        <div className="cc-alert cc-al-a">
          <strong>⚡ First Responder accepted &amp; en route</strong><br />
          Heading to patient location now.
        </div>
      )}

      {/* ── Action buttons — exactly as HTML ── */}
      <button className="cc-btn cc-btn-primary" onClick={dispatchAndPing}>
        Dispatch ambulance + ping first responders
      </button>
      <button className="cc-btn cc-btn-sec" style={{ marginTop: '6px' }} onClick={dispatchOnly}>
        Dispatch ambulance only
      </button>
      <button className="cc-btn cc-btn-sec" style={{ marginTop: '4px', fontSize: '10px', color: '#6b7280' }}>
        Override recommendation
      </button>
    </div>
  );
};

export default DispatcherPage;
