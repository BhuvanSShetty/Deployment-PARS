import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import { calculateDistance, calculateETA, formatDistance, HOSPITAL_LOCATION } from '../utils/locationUtils.js';
import '../styles/HospitalPage.css';

const HospitalPage = () => {
    const { t } = useTranslation();
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Polling');
    const [filterRisk, setFilterRisk] = useState('ALL');
    const [hospitalLocation] = useState(HOSPITAL_LOCATION);
    const [liveVitalsByAmbulance, setLiveVitalsByAmbulance] = useState({});
    const [hospitalId] = useState(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.hospitalId || null;
    });

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5050/api/patients/hospital', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPatients(data);
                }
            } catch (error) {
                console.error('Error fetching patients:', error);
            }
        };

        fetchPatients();
        const pollId = setInterval(fetchPatients, 10000);
        return () => clearInterval(pollId);
    }, []);

    useEffect(() => {
        const newSocket = io('http://localhost:5050', {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            setConnectionStatus('Vitals WS Connected');
        });

        newSocket.on('disconnect', () => {
            setConnectionStatus('Vitals WS Disconnected');
        });

        newSocket.on('liveVitals', (payload) => {
            if (hospitalId && payload?.hospitalId && payload.hospitalId !== hospitalId) {
                return;
            }
            if (!payload?.ambulanceId) return;
            setLiveVitalsByAmbulance(prev => ({
                ...prev,
                [payload.ambulanceId]: payload
            }));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [hospitalId]);

    useEffect(() => {
        let next = patients;
        if (hospitalId) {
            next = next.filter(p => p.hospital?._id === hospitalId);
        }
        next = next.filter(p => !['at_hospital', 'closed'].includes(p.incident?.status));
        if (filterRisk !== 'ALL') {
            next = next.filter(p => p.riskPrediction?.category === filterRisk);
        }
        setFilteredPatients(next);
    }, [patients, filterRisk, hospitalId]);

    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'HIGH':
                return '#ff4444';
            case 'MEDIUM':
                return '#ffa500';
            case 'LOW':
                return '#44ff44';
            default:
                return '#999';
        }
    };

    const getAmbulanceETA = (patient) => {
        const ambulance = patient?.ambulance;
        const hospital = patient?.hospital;

        const targetLocation = hospital?.location || hospitalLocation;
        const hasCoords = ambulance?.currentLocation?.lat && ambulance?.currentLocation?.lng;
        const hasTarget = targetLocation?.lat && targetLocation?.lng;

        let distance = null;
        if (hasCoords && hasTarget) {
            distance = calculateDistance(
                ambulance.currentLocation.lat,
                ambulance.currentLocation.lng,
                targetLocation.lat,
                targetLocation.lng
            );
        }

        const eta = Number.isFinite(patient?.incident?.etaMinutes)
            ? patient.incident.etaMinutes
            : distance != null
                ? calculateETA(distance)
                : null;

        const formattedDistance = distance != null ? formatDistance(distance) : null;

        if (!eta && !formattedDistance) return null;

        return {
            distance: formattedDistance,
            eta,
            lat: ambulance?.currentLocation?.lat,
            lng: ambulance?.currentLocation?.lng
        };
    };

    return (
        <div className="hospital-page">
            <header className="hospital-header">
                <h1>{t('hospital_dashboard')}</h1>
                <div className={`connection-status ${connectionStatus.includes('Connected') ? 'connected' : 'disconnected'}`}>
                    {connectionStatus}
                </div>
            </header>

            <div className="controls">
                <div className="filter-section">
                    <label>{t('filter_risk')}</label>
                    <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                        <option value="ALL">{t('all_patients')}</option>
                        <option value="HIGH">{t('high_risk_filter')}</option>
                        <option value="MEDIUM">{t('medium_risk_filter')}</option>
                        <option value="LOW">{t('low_risk_filter')}</option>
                    </select>
                </div>
                <div className="patient-count">
                    {t('total_patients_label')} <strong>{filteredPatients.length}</strong>
                </div>
            </div>

            <div className="patients-container">
                {filteredPatients.length === 0 ? (
                    <div className="no-patients">
                        {t('no_patients')}
                    </div>
                ) : (
                    <div className="patients-grid">
                        {filteredPatients.map((patient) => (
                            <div key={patient._id} className="patient-card">
                                <div className="patient-header">
                                    <h3>{t('patient_id_label')} {patient._id?.slice(-6)}</h3>
                                    <div
                                        className="risk-badge"
                                        style={{ backgroundColor: getRiskColor(patient.riskPrediction?.category) }}
                                    >
                                        {patient.riskPrediction?.category || 'UNKNOWN'}
                                    </div>
                                </div>

                                <div className="patient-info">
                                    <p><strong>{t('age_label')}</strong> {patient.age}</p>
                                    <p><strong>{t('sex_label')}</strong> {patient.sex}</p>
                                    {patient.symptoms && patient.symptoms.length > 0 && (
                                        <p><strong>{t('symptoms_label')}</strong> {patient.symptoms.join(', ')}</p>
                                    )}
                                    {patient.incident?.status && (
                                        <p><strong>{t('status_label')}</strong> {patient.incident.status}</p>
                                    )}
                                </div>

                                {patient.ambulance && (
                                    <div className="ambulance-info-section">
                                        <h4>{t('ambulance_details_title')}</h4>
                                        <p><strong>{t('ambulance_id_label')}</strong> {patient.ambulance.ambulanceId}</p>
                                        <p><strong>{t('number_plate_label')}</strong> {patient.ambulance.numberPlate}</p>
                                        <p><strong>{t('driver_name_label')}</strong> {patient.ambulance.driver?.name}</p>
                                        <p><strong>{t('phone_label')}</strong> {patient.ambulance.driver?.phone}</p>

                                        {(() => {
                                            const etaInfo = getAmbulanceETA(patient);
                                            if (etaInfo) {
                                                return (
                                                    <div className="eta-section">
                                                        <h5>{t('live_location_eta')}</h5>
                                                        <p><strong>{t('distance_label')}</strong> {etaInfo.distance}</p>
                                                        <p className="eta-highlight">
                                                            <strong>{t('eta_label')}</strong> <span className="eta-value">{etaInfo.eta} {t('eta_mins_suffix')}</span>
                                                        </p>
                                                        <p className="location-coords">
                                                            <strong>{t('coords_label')}</strong> {etaInfo.lat.toFixed(4)}, {etaInfo.lng.toFixed(4)}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}

                                <div className="vitals-section">
                                    <h4>{t('latest_vitals')}</h4>
                                    {(() => {
                                        const liveVitals = patient.ambulance?._id
                                            ? liveVitalsByAmbulance[patient.ambulance._id]
                                            : null;
                                        const vitals = liveVitals?.vitals || patient.vitals;
                                        return (
                                            <>
                                                <div className="vitals-mini">
                                                    <span>BP: {vitals?.systolicBP}/{vitals?.diastolicBP}</span>
                                                    <span>HR: {vitals?.heartRate} bpm</span>
                                                    <span>O2: {vitals?.spo2}%</span>
                                                    <span>Temp: {vitals?.temperature}°C</span>
                                                </div>
                                                <div className="vitals-mini">
                                                    <span>Pain: {vitals?.painScore}/10</span>
                                                    <span>RR: {vitals?.respiratoryRate} rpm</span>
                                                </div>
                                                {liveVitals?.timestamp && (
                                                    <div className="timestamp">
                                                        {t('live_update_prefix')} {new Date(liveVitals.timestamp).toLocaleTimeString()}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="risk-prediction">
                                    <h4>{t('risk_prediction_title')}</h4>
                                    <p>{t('level_prefix')} {patient.riskPrediction?.level}/5</p>
                                    <p>
                                        {t('score_label')}{' '}
                                        {Number.isFinite(patient.riskPrediction?.score)
                                            ? `${(patient.riskPrediction.score * 100).toFixed(1)}%`
                                            : 'N/A'}
                                    </p>
                                </div>

                                {patient.paramedicNotes && (
                                    <div className="notes-section">
                                        <h4>{t('paramedic_notes_title')}</h4>
                                        <p>{patient.paramedicNotes}</p>
                                    </div>
                                )}

                                <div className="timestamp">
                                    {t('updated_prefix')} {new Date(patient.updatedAt).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalPage;
