import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import LanguageSwitcher from './components/LanguageSwitcher'
import LoginPage from './pages/LoginPage'
import AmbulancePage from './pages/AmbulancePage'
import AmbulanceSessionPage from './pages/AmbulanceSessionPage'
import HospitalPage from './pages/HospitalPage'
import AdminPage from './pages/AdminPage'
import AdminHospitalRegisterPage from './pages/AdminHospitalRegisterPage'
import AdminAmbulanceRegisterPage from './pages/AdminAmbulanceRegisterPage'
import CallerPage from './pages/CallerPage'
import DispatcherPage from './pages/DispatcherPage'
import LandingPage from './pages/LandingPage'
import './App.css'

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

function AppShell() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  return (
    <>
      {user && (
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
                 <rect width="100" height="100" rx="25" fill="#90AEB2"/>
                 <path d="M50 25 L50 75 M25 50 L75 50" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/>
               </svg>
               {t('nav_home')}
            </Link>
            <ul className="nav-menu">
              {(user.role === 'paramedic' || user.role === 'driver') && (
                <li className="nav-item">
                  <Link to="/ambulance" className="nav-link">
                     {t('nav_ambulance')}
                  </Link>
                </li>
              )}
              {user.role === 'dispatcher' && (
                <li className="nav-item">
                  <Link to="/dispatcher" className="nav-link">
                     {t('nav_dispatcher')}
                  </Link>
                </li>
              )}
              {(user.role === 'hospital' || user.role === 'admin') && (
                <li className="nav-item">
                  <Link to="/hospital" className="nav-link">
                     {t('nav_hospital')}
                  </Link>
                </li>
              )}
              {user.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin" className="nav-link">
                    {t('nav_admin')}
                  </Link>
                </li>
              )}
              {user.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin/hospitals/new" className="nav-link">
                    {t('nav_add_hospital')}
                  </Link>
                </li>
              )}
              {user.role === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin/ambulances/new" className="nav-link">
                    {t('nav_add_ambulance')}
                  </Link>
                </li>
              )}
              <li className="nav-item user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role">{user.role}</span>
              </li>
              <li className="nav-item">
                <button className="logout-btn" onClick={handleLogout}>
                  {t('logout')}
                </button>
              </li>
              <li className="nav-item">
                <LanguageSwitcher />
              </li>
            </ul>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/caller" element={<CallerPage />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={
                  user.role === 'admin'
                    ? '/admin'
                    : user.role === 'hospital'
                    ? '/hospital'
                    : user.role === 'dispatcher'
                    ? '/dispatcher'
                    : '/ambulance'
                }
              />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
        <Route 
          path="/" 
          element={
            user ? (
               <Navigate
                to={
                  user.role === 'admin'
                    ? '/admin'
                    : user.role === 'hospital'
                    ? '/hospital'
                    : user.role === 'dispatcher'
                    ? '/dispatcher'
                    : '/ambulance'
                }
              />
            ) : (
              <LandingPage />
            )
          } 
        />
        <Route
          path="/ambulance"
          element={(user?.role === 'paramedic' || user?.role === 'driver') ? <AmbulancePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/ambulance/session"
          element={(user?.role === 'paramedic' || user?.role === 'driver') ? <AmbulanceSessionPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/dispatcher"
          element={user?.role === 'dispatcher' ? <DispatcherPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/hospital"
          element={user && ['hospital', 'admin'].includes(user.role) ? <HospitalPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/hospitals/new"
          element={user?.role === 'admin' ? <AdminHospitalRegisterPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/ambulances/new"
          element={user?.role === 'admin' ? <AdminAmbulanceRegisterPage /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </>
  )
}

// Home page removed since users are directly routed to their dashboards
export default App
