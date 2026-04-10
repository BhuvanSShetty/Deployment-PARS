import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/AdminPage.css';

const AdminPage = () => {
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        totalPatients: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        totalAmbulances: 0,
        availableAmbulances: 0,
        onDutyAmbulances: 0,
        maintenanceAmbulances: 0,
        totalHospitals: 0
    });
    const [hospitals, setHospitals] = useState([]);
    const [patients, setPatients] = useState([]);
    const [ambulancesByStatus, setAmbulancesByStatus] = useState({
        available: [],
        onDuty: [],
        maintenance: []
    });
    const [connectionStatus, setConnectionStatus] = useState('Polling');
    const [selectedTab, setSelectedTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetchStats(token);
        fetchPatients(token);
        fetchAmbulances(token);
        fetchHospitals(token);

        const pollId = setInterval(() => {
            fetchStats(token);
            fetchPatients(token);
            fetchAmbulances(token);
            fetchHospitals(token);
        }, 15000);

        return () => clearInterval(pollId);
    }, []);

    const fetchStats = async (token) => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5050/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats({
                    totalPatients: data.totalPatients || 0,
                    highRiskCount: data.highRiskCount || 0,
                    mediumRiskCount: data.mediumRiskCount || 0,
                    lowRiskCount: data.lowRiskCount || 0,
                    totalAmbulances: data.totalAmbulances || 0,
                    availableAmbulances: data.availableAmbulances || 0,
                    onDutyAmbulances: data.onDutyAmbulances || 0,
                    maintenanceAmbulances: data.maintenanceAmbulances || 0,
                    totalHospitals: data.totalHospitals || 0
                });
                setError(null);
            } else if (response.status === 401) {
                setError('Unauthorized - Please login again');
                window.location.href = '/';
            } else {
                setError('Failed to fetch statistics');
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError('Error fetching statistics');
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async (token) => {
        try {
            const response = await fetch('http://localhost:5050/api/admin/patients', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setPatients(data);
            } else if (response.status === 401) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error fetching patients:', error);
        }
    };

    const fetchAmbulances = async (token) => {
        try {
            const response = await fetch('http://localhost:5050/api/admin/ambulances', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAmbulancesByStatus(data);
            } else if (response.status === 401) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error fetching ambulances:', error);
        }
    };

    const fetchHospitals = async (token) => {
        try {
            const response = await fetch('http://localhost:5050/api/admin/hospitals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHospitals(data);
            } else if (response.status === 401) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error fetching hospitals:', error);
        }
    };


    const handleExport = () => {
        const dataStr = JSON.stringify(patients, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `patients_${new Date().getTime()}.json`;
        link.click();
    };

    const handleDeletePatient = async (patientId) => {
        if (!window.confirm(t('delete_confirm'))) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5050/api/patients/${patientId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setPatients(prev => prev.filter(p => p._id !== patientId));
            } else if (response.status === 401) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
        }
    };

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1>{t('admin_dashboard')}</h1>
                <div className={`connection-status ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
                    {t(`status_${connectionStatus.toLowerCase()}`)}
                </div>
            </header>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <nav className="admin-nav">
                <button className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`} onClick={() => setSelectedTab('overview')}>{t('tab_overview')}</button>
                <button className={`tab-btn ${selectedTab === 'ambulances' ? 'active' : ''}`} onClick={() => setSelectedTab('ambulances')}>{t('tab_ambulances')} ({stats.totalAmbulances})</button>
                <button className={`tab-btn ${selectedTab === 'patients' ? 'active' : ''}`} onClick={() => setSelectedTab('patients')}>{t('tab_patients')} ({stats.totalPatients})</button>
                <button className={`tab-btn ${selectedTab === 'hospitals' ? 'active' : ''}`} onClick={() => setSelectedTab('hospitals')}>{t('tab_hospitals')} ({stats.totalHospitals})</button>
            </nav>

            {selectedTab === 'overview' && (
                <div className="overview-section">
                    <div className="stats-grid">
                        <div className="stat-card total">
                            <h3>Total Patients</h3>
                            <div className="stat-value">{stats.totalPatients}</div>
                        </div>

                        <div className="stat-card high">
                            <h3>High Risk</h3>
                            <div className="stat-value">{stats.highRiskCount}</div>
                        </div>

                        <div className="stat-card medium">
                            <h3>{t('stat_medium_risk')}</h3>
                            <div className="stat-value">{stats.mediumRiskCount}</div>
                        </div>

                        <div className="stat-card low">
                            <h3>{t('stat_low_risk')}</h3>
                            <div className="stat-value">{stats.lowRiskCount}</div>
                        </div>

                        <div className="stat-card ambulance available">
                            <h3>{t('stat_available_amb')}</h3>
                            <div className="stat-value">{stats.availableAmbulances}</div>
                        </div>

                        <div className="stat-card ambulance onduty">
                            <h3>{t('stat_on_duty')}</h3>
                            <div className="stat-value">{stats.onDutyAmbulances}</div>
                        </div>

                        <div className="stat-card ambulance maintenance">
                            <h3>{t('stat_in_maintenance')}</h3>
                            <div className="stat-value">{stats.maintenanceAmbulances}</div>
                        </div>

                        <div className="stat-card ambulance total-ambulance">
                            <h3>Total Ambulances</h3>
                            <div className="stat-value">{stats.totalAmbulances}</div>
                        </div>

                        <div className="stat-card">
                            <h3>Total Hospitals</h3>
                            <div className="stat-value">{stats.totalHospitals}</div>
                        </div>
                    </div>

                    <div className="recent-activity">
                        <h2>{t('recent_activity')}</h2>
                        <div className="activity-list">
                            {patients.slice(0, 5).map((patient) => (
                                <div key={patient._id} className="activity-item">
                                    <div className="activity-info">
                                        <p className="activity-patient">{t('patient_label')} {patient._id?.slice(-6)}</p>
                                        <p className="activity-time">
                                            {new Date(patient.updatedAt).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div
                                        className="activity-risk"
                                        style={{
                                            color: patient.riskPrediction?.category === 'HIGH' ? '#ff4444' :
                                                patient.riskPrediction?.category === 'MEDIUM' ? '#ffa500' : '#44ff44'
                                        }}
                                    >
                                        {patient.riskPrediction?.category}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'ambulances' && (
                <div className="ambulances-section">
                    <h2>{t('fleet_title')}</h2>

                    <div className="amb-status-group">
                        <h3 className="status-heading available-heading">{t('available_label')} ({ambulancesByStatus.available.length})</h3>
                        {ambulancesByStatus.available.length === 0 ? (
                            <div className="no-data">{t('no_available_amb')}</div>
                        ) : (
                            <div className="ambulance-cards">
                                {ambulancesByStatus.available.map((amb) => (
                                    <div key={amb._id} className="ambulance-card status-available">
                                        <div className="amb-card-header">
                                            <h4>{amb.ambulanceId}</h4>
                                            <span className="amb-status-badge available">Available</span>
                                        </div>
                                        <p><strong>Plate:</strong> {amb.numberPlate || 'N/A'}</p>
                                        <p><strong>Type:</strong> {amb.serviceLevel || 'N/A'}</p>
                                        <p><strong>Model:</strong> {amb.vehicle?.model || 'N/A'}</p>
                                        <p><strong>Driver:</strong> {amb.driver?.name || 'N/A'}</p>
                                        <p><strong>Contact:</strong> {amb.contactNumber || amb.driver?.phone || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="amb-status-group">
                        <h3 className="status-heading onduty-heading"> {t('on_duty_label')} ({ambulancesByStatus.onDuty.length})</h3>
                        {ambulancesByStatus.onDuty.length === 0 ? (
                            <div className="no-data">{t('no_duty_amb')}</div>
                        ) : (
                            <div className="ambulance-cards">
                                {ambulancesByStatus.onDuty.map((amb) => (
                                    <div key={amb._id} className="ambulance-card status-onduty">
                                        <div className="amb-card-header">
                                            <h4>{amb.ambulanceId}</h4>
                                            <span className="amb-status-badge onduty">On Duty</span>
                                        </div>
                                        <p><strong>Plate:</strong> {amb.numberPlate || 'N/A'}</p>
                                        <p><strong>Type:</strong> {amb.serviceLevel || 'N/A'}</p>
                                        <p><strong>Model:</strong> {amb.vehicle?.model || 'N/A'}</p>
                                        <p><strong>Driver:</strong> {amb.driver?.name || 'N/A'}</p>
                                        <p><strong>Contact:</strong> {amb.contactNumber || amb.driver?.phone || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="amb-status-group">
                        <h3 className="status-heading maintenance-heading">{t('maintenance_label')} ({ambulancesByStatus.maintenance.length})</h3>
                        {ambulancesByStatus.maintenance.length === 0 ? (
                            <div className="no-data">{t('no_maintenance_amb')}</div>
                        ) : (
                            <div className="ambulance-cards">
                                {ambulancesByStatus.maintenance.map((amb) => (
                                    <div key={amb._id} className="ambulance-card status-maintenance">
                                        <div className="amb-card-header">
                                            <h4>{amb.ambulanceId}</h4>
                                            <span className="amb-status-badge maintenance">Maintenance</span>
                                        </div>
                                        <p><strong>Plate:</strong> {amb.numberPlate || 'N/A'}</p>
                                        <p><strong>Type:</strong> {amb.serviceLevel || 'N/A'}</p>
                                        <p><strong>Model:</strong> {amb.vehicle?.model || 'N/A'}</p>
                                        <p><strong>Driver:</strong> {amb.driver?.name || 'N/A'}</p>
                                        <p><strong>Notes:</strong> {amb.notes || 'None'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedTab === 'patients' && (
                <div className="patients-section">
                    <div className="section-header">
                        <h2>{t('patient_records')}</h2>
                        <button className="export-btn" onClick={handleExport}>{t('export_data')}</button>
                    </div>

                    <div className="patients-table-wrapper">
                        <table className="patients-table">
                            <thead>
                                <tr>
                                    <th>{t('col_patient_id')}</th>
                                    <th>{t('col_age')}</th>
                                    <th>{t('col_sex')}</th>
                                    <th>{t('col_risk_level')}</th>
                                    <th>BP</th>
                                    <th>HR</th>
                                    <th>O2</th>
                                    <th>Temp</th>
                                    <th>{t('col_last_updated')}</th>
                                    <th>{t('col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((patient) => (
                                    <tr key={patient._id}>
                                        <td>{patient._id?.slice(-6)}</td>
                                        <td>{patient.age}</td>
                                        <td>{patient.sex}</td>
                                        <td>
                                            <span
                                                className="risk-badge-table"
                                                style={{
                                                    backgroundColor: patient.riskPrediction?.category === 'HIGH' ? '#ff4444' :
                                                        patient.riskPrediction?.category === 'MEDIUM' ? '#ffa500' : '#44ff44'
                                                }}
                                            >
                                                {patient.riskPrediction?.category}
                                            </span>
                                        </td>
                                        <td>{patient.vitals?.systolicBP}/{patient.vitals?.diastolicBP}</td>
                                        <td>{patient.vitals?.heartRate}</td>
                                        <td>{patient.vitals?.spo2}%</td>
                                        <td>{patient.vitals?.temperature}°C</td>
                                        <td>{new Date(patient.updatedAt).toLocaleTimeString()}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => handleDeletePatient(patient._id)}>
                                                {t('delete_btn')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedTab === 'hospitals' && (
                <div className="hospitals-section">
                    <h2>{t('registered_hospitals')}</h2>
                    <div className="hospital-cards">
                        {hospitals.map((hospital) => (
                            <div key={hospital._id} className="hospital-card glass-effect">
                                <div className="hosp-card-header">
                                    <h4>{hospital.name}</h4>
                                    <span className={`hosp-status-badge ${hospital.isActive ? 'available' : 'maintenance'}`}>
                                        {hospital.isActive ? t('online_label') : t('offline_label')}
                                    </span>
                                </div>
                                <p><strong>{t('level_label')}:</strong> {hospital.level || t('standard_label')}</p>
                                <p><strong>{t('total_beds')}:</strong> {hospital.capacity?.totalBeds || 'N/A'}</p>
                                <p><strong>{t('icu_beds')}:</strong> {hospital.capacity?.icuBeds || 'N/A'}</p>
                            </div>
                        ))}
                        {hospitals.length === 0 && <div className="no-data">{t('no_hospitals')}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPage;
