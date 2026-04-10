import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5050/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onLoginSuccess(data.user);

                switch (data.user.role) {
                    case 'admin':
                        navigate('/admin');
                        break;
                    case 'hospital':
                        navigate('/hospital');
                        break;
                    case 'paramedic':
                    case 'driver':
                        navigate('/ambulance');
                        break;
                    case 'dispatcher':
                        navigate('/dispatcher');
                        break;
                    default:
                        navigate('/');
                }
            } else {
                setError(t(data.error) || t('login_error_wrong'));
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(t('login_error_server'));
        } finally {
            setLoading(false);
        }
    };

    const demoAccounts = [
        { email: 'admin@hospital.com', password: 'admin123', role: 'Admin', desc: 'Full access' },
        { email: 'dispatch@ems.com', password: 'dispatch123', role: 'Dispatch', desc: 'Assign calls' },
        { email: 'paramedic@ambulance.com', password: 'para123', role: 'Ambulance', desc: 'On the road' },
        { email: 'hospital@health.com', password: 'hosp123', role: 'Hospital', desc: 'ER dashboard' }
    ];

    const useDemoAccount = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>{t('welcome_back')}</h1>
                    <p>{t('sign_in_dashboard')}</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>{t('email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? t('signing_in') : t('sign_in')}
                    </button>
                </form>

                <div className="demo-section">
                    <h3>{t('demo_title')}</h3>
                    <div className="demo-accounts">
                        {demoAccounts.map((account) => (
                            <button
                                key={account.email}
                                type="button"
                                className="demo-btn"
                                onClick={() => useDemoAccount(account.email, account.password)}
                            >
                                <span className="demo-role">{account.role}</span>
                                <span className="demo-email">{account.email}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="demo-section">
                    <h3>{t('emergency_title')}</h3>
                    <button
                        type="button"
                        className="demo-btn caller-link-btn"
                        onClick={() => navigate('/caller')}
                    >
                        {t('open_caller_form')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
