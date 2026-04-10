import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import '../styles/AmbulanceSessionPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;

const AmbulanceSessionPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { patient, ambulanceId, incidentId, hospital, hospitalOptions } = location.state || {};

    const [currentHospital, setCurrentHospital] = useState(hospital || null);
    const [currentOptions, setCurrentOptions] = useState(hospitalOptions || []);
    const [switching, setSwitching] = useState(false);
    const [switchStatus, setSwitchStatus] = useState('');

    const [socket, setSocket] = useState(null);
    const [liveVitals, setLiveVitals] = useState(patient?.vitals || {});
    const [ending, setEnding] = useState(false);
    const [status, setStatus] = useState('');
    const emitTimerRef = useRef(null);

    useEffect(() => {
        if (!patient || !ambulanceId) {
            navigate('/ambulance');
            return;
        }

        const newSocket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionDelay: 1000
        });

        newSocket.on('deviceVitals', (data) => {
            setLiveVitals(prev => ({
                ...prev,
                heartRate: data.heartRate || prev.heartRate,
                respiratoryRate: data.respiratoryRate || prev.respiratoryRate,
                temperature: data.temperature || prev.temperature,
                spo2: data.spo2 || prev.spo2
            }));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [patient, ambulanceId, navigate]);

    useEffect(() => {
        if (!socket || !ambulanceId) return;

        if (emitTimerRef.current) {
            clearTimeout(emitTimerRef.current);
        }

        emitTimerRef.current = setTimeout(() => {
            socket.emit('liveVitals', {
                ambulanceId,
                incidentId: incidentId || null,
                hospitalId: currentHospital?._id || null,
                patient: {
                    age: patient?.age || null,
                    sex: patient?.sex || null,
                    symptoms: patient?.symptoms || []
                },
                vitals: {
                    systolicBP: liveVitals?.systolicBP || null,
                    diastolicBP: liveVitals?.diastolicBP || null,
                    heartRate: liveVitals?.heartRate || null,
                    respiratoryRate: liveVitals?.respiratoryRate || null,
                    temperature: liveVitals?.temperature || null,
                    painScore: liveVitals?.painScore || null,
                    spo2: liveVitals?.spo2 || null
                },
                timestamp: new Date()
            });
        }, 500);

        return () => {
            if (emitTimerRef.current) {
                clearTimeout(emitTimerRef.current);
            }
        };
    }, [socket, ambulanceId, incidentId, hospital, patient, liveVitals]);

    const handleEndSession = async () => {
        if (!incidentId) {
            navigate('/ambulance');
            return;
        }

        setEnding(true);
        setStatus('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/dispatch/incidents/${incidentId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'closed' })
            });

            if (!response.ok) {
                const data = await response.json();
                setStatus(data.error || 'Failed to end session');
            } else {
                navigate('/ambulance');
            }
        } catch (error) {
            setStatus('Failed to end session');
        } finally {
            setEnding(false);
        }
    };

    const handleSwitchHospital = async (hospitalId) => {
        if (!incidentId || !hospitalId) return;

        setSwitching(true);
        setSwitchStatus('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/dispatch/incidents/${incidentId}/hospital`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ hospitalId })
            });

            if (!response.ok) {
                const data = await response.json();
                setSwitchStatus(data.error || 'Failed to change hospital');
                return;
            }

            const updated = await response.json();
            setCurrentHospital(updated.assignedHospital || null);
            setCurrentOptions(updated.hospitalOptions || []);
        } catch (error) {
            setSwitchStatus('Failed to change hospital');
        } finally {
            setSwitching(false);
        }
    };

    return (
        <div className="ambulance-session-page">
            <header className="session-header">
                <div>
                    <h1>Live Patient Session</h1>
                    <p>Monitor vitals and track risk while en route.</p>
                </div>
                <button className="end-btn" onClick={handleEndSession} disabled={ending}>
                    {ending ? 'Ending...' : 'End Session'}
                </button>
            </header>

            {status && <div className="session-alert">{status}</div>}

            <section className="session-grid">
                <div className="session-card">
                    <h2>Destination Hospital</h2>
                    <p><strong>Name:</strong> {currentHospital?.name || 'Pending'}</p>
                    {currentHospital?.location?.address && (
                        <p><strong>Address:</strong> {currentHospital.location.address}</p>
                    )}
                    {currentHospital?.location?.lat && currentHospital?.location?.lng && (
                        <p><strong>Location:</strong> {currentHospital.location.lat.toFixed(5)}, {currentHospital.location.lng.toFixed(5)}</p>
                    )}
                </div>

                <div className="session-card">
                    <h2>Backup Hospital Options</h2>
                    {switchStatus && <div className="session-alert">{switchStatus}</div>}
                    {currentOptions?.length ? (
                        currentOptions
                            .filter((option) => option.hospital?._id !== currentHospital?._id)
                            .slice(0, 3)
                            .map((option) => (
                                <div key={option._id || option.hospital?._id} className="hospital-option">
                                    <p><strong>Name:</strong> {option.hospital?.name || 'Unknown'}</p>
                                    {option.distanceKm != null && (
                                        <p><strong>Distance:</strong> {option.distanceKm.toFixed(2)} km</p>
                                    )}
                                    {option.reason && (
                                        <p><strong>Reason:</strong> {option.reason === 'advanced_care' ? 'Advanced care' : 'Nearest'} </p>
                                    )}
                                    <button
                                        type="button"
                                        className="end-btn"
                                        onClick={() => handleSwitchHospital(option.hospital?._id)}
                                        disabled={switching}
                                    >
                                        {switching ? 'Switching...' : 'Switch to this hospital'}
                                    </button>
                                </div>
                            ))
                    ) : (
                        <p>No backup hospitals available.</p>
                    )}
                </div>

                <div className="session-card">
                    <h2>Risk Score</h2>
                    <p className="risk-level">Level: {patient?.riskPrediction?.level || 'N/A'} / 5</p>
                    <p>Category: {patient?.riskPrediction?.category || 'N/A'}</p>
                    {patient?.riskPrediction?.score != null && (
                        <p>Score: {(patient.riskPrediction.score * 100).toFixed(1)}%</p>
                    )}
                </div>

                <div className="session-card vitals">
                    <h2>Live Vitals</h2>
                    <div className="vitals-grid">
                        <div>
                            <span>BP</span>
                            <strong>{liveVitals?.systolicBP}/{liveVitals?.diastolicBP}</strong>
                        </div>
                        <div>
                            <span>Heart Rate</span>
                            <strong>{liveVitals?.heartRate} bpm</strong>
                        </div>
                        <div>
                            <span>Resp Rate</span>
                            <strong>{liveVitals?.respiratoryRate} rpm</strong>
                        </div>
                        <div>
                            <span>Temperature</span>
                            <strong>{liveVitals?.temperature} °C</strong>
                        </div>
                        <div>
                            <span>SpO2</span>
                            <strong>{liveVitals?.spo2}%</strong>
                        </div>
                        <div>
                            <span>Pain</span>
                            <strong>{liveVitals?.painScore}/10</strong>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AmbulanceSessionPage;
