import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { watchLocation, stopWatchingLocation, getCurrentLocation } from '../utils/locationUtils.js';
import '../styles/AmbulancePage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

const AmbulancePage = () => {
    const { t } = useTranslation();
    const [socket, setSocket] = useState(null);
    const [ambulances, setAmbulances] = useState([]);
    const [selectedAmbulance, setSelectedAmbulance] = useState('');
    const [assignedIncident, setAssignedIncident] = useState(null);
    const [currentLocation, setCurrentLocation] = useState({ lat: null, lng: null });
    const [locationWatchId, setLocationWatchId] = useState(null);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const [patientData, setPatientData] = useState({
        painScore: '',
        systolicBP: '',
        diastolicBP: '',
        heartRate: 0,
        respiratoryRate: 0,
        temperature: 0,
        spo2: 0,
        age: '',
        sex: '',
        symptoms: '',
        knownConditions: {
            hypertension: false,
            diabetes: false,
            cardiacHistory: false
        },
        paramedicNotes: ''
    });

    const [submitted, setSubmitted] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [isAmbulanceLocked, setIsAmbulanceLocked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAmbulances = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const token = localStorage.getItem('token');

                if (user.ambulanceId) {
                    const res = await fetch(`${API_BASE_URL}/api/ambulances/${user.ambulanceId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const ambulance = await res.json();
                        setAmbulances([ambulance]);
                        setSelectedAmbulance(ambulance._id);
                        setIsAmbulanceLocked(true);

                    }
                } else {
                    const response = await fetch(`${API_BASE_URL}/api/ambulances/available`);
                    if (response.ok) {
                        const data = await response.json();
                        setAmbulances(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching ambulances:', error);
            }
        };

        fetchAmbulances();

        const newSocket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        newSocket.on('connect', () => {
            setConnectionStatus('Connected');
        });

        newSocket.on('disconnect', () => {
            setConnectionStatus('Disconnected');
        });

        newSocket.on('deviceVitals', (data) => {
            setPatientData(prev => ({
                ...prev,
                heartRate: data.heartRate || 0,
                respiratoryRate: data.respiratoryRate || 0,
                temperature: data.temperature || 0,
                spo2: data.spo2 || 0
            }));
        });

        setSocket(newSocket);

        return () => {
            if (locationWatchId !== null) {
                stopWatchingLocation(locationWatchId);
            }
            newSocket.disconnect();
        };
    }, [locationWatchId]);

    useEffect(() => {
        if (!selectedAmbulance) {
            setAssignedIncident(null);
        }
    }, [selectedAmbulance]);

    useEffect(() => {
        const fetchActiveIncident = async () => {
            if (!selectedAmbulance) return;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `${API_BASE_URL}/api/dispatch/ambulances/${selectedAmbulance}/active`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data) {
                        setAssignedIncident(data);
                        setPatientData(prev => ({
                            ...prev,
                            age: data.patientAge ? String(data.patientAge) : prev.age,
                            sex: data.patientSex || prev.sex,
                            symptoms: data.symptoms?.length ? data.symptoms.join(', ') : prev.symptoms
                        }));
                        if (data.patient) {
                            navigate('/ambulance/session', {
                                state: {
                                    patient: data.patient,
                                    ambulanceId: selectedAmbulance,
                                    incidentId: data._id,
                                    hospital: data.assignedHospital || null,
                                    hospitalOptions: data.hospitalOptions || []
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching active incident:', error);
            }
        };

        fetchActiveIncident();
    }, [selectedAmbulance]);

    useEffect(() => {
        if (!assignedIncident) return;

        setPatientData(prev => ({
            ...prev,
            age: assignedIncident.patientAge ? String(assignedIncident.patientAge) : prev.age,
            sex: assignedIncident.patientSex || prev.sex,
            symptoms: assignedIncident.symptoms?.length ? assignedIncident.symptoms.join(', ') : prev.symptoms
        }));
    }, [assignedIncident]);

    const startLocationTracking = async () => {
        try {
            const location = await getCurrentLocation();
            setCurrentLocation(location);

            const watchId = watchLocation((position) => {
                setCurrentLocation({
                    lat: position.lat,
                    lng: position.lng
                });

                if (selectedAmbulance) {
                    const token = localStorage.getItem('token');
                    fetch(`${API_BASE_URL}/api/ambulances/${selectedAmbulance}/location`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ lat: position.lat, lng: position.lng })
                    }).catch(() => null);
                }
            });

            setLocationWatchId(watchId);
            setIsTrackingLocation(true);
        } catch (error) {
            console.error('Error starting location tracking:', error);
            alert('Unable to access location. Please enable location permissions.');
        }
    };

    const stopLocationTracking = () => {
        if (locationWatchId !== null) {
            stopWatchingLocation(locationWatchId);
            setLocationWatchId(null);
            setIsTrackingLocation(false);
        }
    };

    const handleManualInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setPatientData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setPatientData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!patientData.painScore || !patientData.systolicBP || !patientData.diastolicBP) {
            alert('Please fill in all manual vital fields');
            return;
        }

        if (!patientData.age || !patientData.sex) {
            alert('Age and sex are missing from the incident. Please confirm.');
            return;
        }

        if (!selectedAmbulance) {
            alert('Please select an ambulance');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/patients/vitals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    incidentId: assignedIncident?._id,
                    age: parseInt(patientData.age),
                    sex: patientData.sex,
                    vitals: {
                        systolicBP: parseFloat(patientData.systolicBP),
                        diastolicBP: parseFloat(patientData.diastolicBP),
                        heartRate: patientData.heartRate,
                        respiratoryRate: patientData.respiratoryRate,
                        temperature: patientData.temperature,
                        painScore: parseFloat(patientData.painScore),
                        spo2: patientData.spo2
                    },
                    symptoms: patientData.symptoms.split(',').map(s => s.trim()).filter(s => s),
                    knownConditions: patientData.knownConditions,
                    paramedicNotes: patientData.paramedicNotes,
                    ambulanceId: selectedAmbulance,
                    dataSource: 'manual'
                })
            });

            if (response.ok) {
                const result = await response.json();
                setSubmitted(true);
                setAssignedIncident(null);
                setTimeout(() => setSubmitted(false), 300);

                let hospitalOptions = [];
                try {
                    const token = localStorage.getItem('token');
                    const incidentResponse = await fetch(
                        `${API_BASE_URL}/api/dispatch/ambulances/${selectedAmbulance}/active`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    if (incidentResponse.ok) {
                        const incidentData = await incidentResponse.json();
                        hospitalOptions = incidentData?.hospitalOptions || [];
                    }
                } catch (error) {
                    hospitalOptions = [];
                }

                navigate('/ambulance/session', {
                    state: {
                        patient: result,
                        ambulanceId: selectedAmbulance,
                        incidentId: assignedIncident?._id || null,
                            hospital: result?.hospital || null,
                        hospitalOptions
                    }
                });
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Error submitting patient data');
            }
        } catch (error) {
            console.error('Error submitting patient data:', error);
            alert('Error submitting patient data');
        }
    };

    return (
        <div className="ambulance-page">
            <header className="ambulance-header">
                <h1>{t('ambulance_vitals_title')}</h1>
                <div className={`connection-status ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
                    {t(`status_${connectionStatus.toLowerCase()}`)}
                </div>
            </header>

            {submitted ? (
                <div className="success-message">
                    {t('success_submitted')}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="vitals-form">
                    <div className="form-section">
                        <h2>{t('section_amb_info')}</h2>
                        <div className="form-group">
                            <label>{t('select_ambulance_label')}</label>
                            <select
                                value={selectedAmbulance}
                                onChange={(e) => setSelectedAmbulance(e.target.value)}
                                required
                                disabled={isAmbulanceLocked}
                            >
                                <option value="">{t('select_amb_placeholder')}</option>
                                {ambulances.map((ambulance) => (
                                    <option key={ambulance._id} value={ambulance._id}>
                                        {ambulance.ambulanceId} - {ambulance.numberPlate}
                                    </option>
                                ))}
                            </select>
                            {isAmbulanceLocked && (
                                <p className="tracking-status">{t('amb_locked_msg')}</p>
                            )}
                        </div>

                        {selectedAmbulance && ambulances.find(a => a._id === selectedAmbulance) && (
                            <div className="ambulance-details">
                                {(() => {
                                    const selected = ambulances.find(a => a._id === selectedAmbulance);
                                    return (
                                        <>
                                            <div className="detail-group">
                                                <h3>{t('driver_info_title')}</h3>
                                                <p><strong>{t('name_label')}</strong> {selected.driver.name}</p>
                                                <p><strong>{t('phone_label')}</strong> {selected.driver.phone}</p>
                                                <p><strong>{t('license_label')}</strong> {selected.driver.licenseNumber}</p>
                                            </div>
                                            <div className="detail-group">
                                                <h3>{t('vehicle_details_title')}</h3>
                                                <p><strong>{t('ambulance_id_label')}</strong> {selected.ambulanceId}</p>
                                                <p><strong>{t('number_plate_label')}</strong> {selected.numberPlate}</p>
                                                <p><strong>{t('model_label')}:</strong> {selected.vehicle.model}</p>
                                                <p><strong>{t('color_label')}</strong> {selected.vehicle.color}</p>
                                                <p><strong>{t('capacity_label')}</strong> {selected.vehicle.capacity} {t('patients_suffix')}</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {assignedIncident && (
                        <div className="form-section">
                            <h2>{t('assigned_incident_title')}</h2>
                            <div className="ambulance-details">
                                <div className="detail-group">
                                    <h3>{t('caller_intake_title')}</h3>
                                    <p><strong>{t('complaint_label')}</strong> {assignedIncident.chiefComplaint}</p>
                                    <p><strong>{t('symptoms_label')}</strong> {assignedIncident.symptoms?.join(', ') || t('not_provided')}</p>
                                    <p><strong>{t('address')}:</strong> {assignedIncident.location?.address || t('no_address')}</p>
                                </div>
                                <div className="detail-group">
                                    <h3>{t('priority_section')}</h3>
                                    <p><strong>{t('priority_label')}</strong> {assignedIncident.priority}</p>
                                    <p><strong>{t('unit_type_label')}</strong> {assignedIncident.ambulanceType}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-section">
                        <h2>{t('location_tracking_title')}</h2>
                        <div className="location-controls">
                            {!isTrackingLocation ? (
                                <button type="button" className="location-btn start" onClick={startLocationTracking} disabled={!selectedAmbulance}>
                                    {t('start_tracking_btn')}
                                </button>
                            ) : (
                                <button type="button" className="location-btn stop" onClick={stopLocationTracking}>
                                    {t('stop_tracking_btn')}
                                </button>
                            )}
                        </div>

                        {currentLocation.lat && currentLocation.lng && (
                            <div className="location-display">
                                <h3>{t('current_location_title')}</h3>
                                <div className="location-info">
                                    <p><strong>{t('latitude_label')}</strong> {currentLocation.lat.toFixed(6)}</p>
                                    <p><strong>{t('longitude_label')}</strong> {currentLocation.lng.toFixed(6)}</p>
                                    <p className="tracking-status">
                                        {isTrackingLocation ? t('tracking_active') : t('tracking_inactive')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h2>{t('basic_info_title')}</h2>
                        <div className="form-group">
                            <label>{t('age_field_label')}</label>
                            <input
                                type="number"
                                name="age"
                                value={patientData.age}
                                onChange={handleManualInputChange}
                                min="0"
                                max="120"
                                required
                                placeholder={t('age_placeholder')}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('sex_field_label')}</label>
                            <select
                                name="sex"
                                value={patientData.sex}
                                onChange={handleManualInputChange}
                                required
                            >
                                <option value="">{t('select_sex')}</option>
                                <option value="Male">{t('male')}</option>
                                <option value="Female">{t('female')}</option>
                                <option value="Other">{t('other')}</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>{t('symptoms_field_label')}</label>
                            <input type="text" name="symptoms" value={patientData.symptoms} onChange={handleManualInputChange} placeholder={t('symptoms_placeholder')} />
                        </div>

                        <div className="form-group">
                            <label>{t('paramedic_notes_field')}</label>
                            <textarea name="paramedicNotes" value={patientData.paramedicNotes} onChange={handleManualInputChange} placeholder={t('paramedic_notes_placeholder')} rows="3" />
                        </div>
                    </div>

                    <div className="form-section">
                        <h2>{t('medical_history_title')}</h2>
                        <div className="checkbox-group">
                            <label>
                                <input
                                    type="checkbox"
                                    name="knownConditions.hypertension"
                                    checked={patientData.knownConditions.hypertension}
                                    onChange={handleManualInputChange}
                                />
                                {t('hypertension')}
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="knownConditions.diabetes"
                                    checked={patientData.knownConditions.diabetes}
                                    onChange={handleManualInputChange}
                                />
                                {t('diabetes')}
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    name="knownConditions.cardiacHistory"
                                    checked={patientData.knownConditions.cardiacHistory}
                                    onChange={handleManualInputChange}
                                />
                                {t('cardiac_history')}
                            </label>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2>{t('manual_vitals_title')}</h2>
                        <div className="vitals-grid">
                            <div className="form-group">
                                <label>{t('systolic_bp_label')}</label>
                                <input
                                    type="number"
                                    name="systolicBP"
                                    value={patientData.systolicBP}
                                    onChange={handleManualInputChange}
                                    placeholder="e.g., 120"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('diastolic_bp_label')}</label>
                                <input
                                    type="number"
                                    name="diastolicBP"
                                    value={patientData.diastolicBP}
                                    onChange={handleManualInputChange}
                                    placeholder="e.g., 80"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('pain_score_label')}</label>
                                <input
                                    type="number"
                                    name="painScore"
                                    value={patientData.painScore}
                                    onChange={handleManualInputChange}
                                    min="0"
                                    max="10"
                                    placeholder="0-10"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2>{t('live_vitals_title')}</h2>
                        <div className="vitals-grid">
                            <div className="vital-display">
                                <label>{t('heart_rate_label')}</label>
                                <div className="vital-value">{patientData.heartRate}</div>
                            </div>

                            <div className="vital-display">
                                <label>{t('resp_rate_label')}</label>
                                <div className="vital-value">{patientData.respiratoryRate}</div>
                            </div>

                            <div className="vital-display">
                                <label>{t('temperature_label')}</label>
                                <div className="vital-value">{patientData.temperature.toFixed(1)}</div>
                            </div>

                            <div className="vital-display">
                                <label>{t('spo2_label')}</label>
                                <div className="vital-value">{patientData.spo2}</div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="submit-btn">
                        {t('submit_patient_btn')}
                    </button>
                </form>
            )}
        </div>
    );
};

export default AmbulancePage;
