import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/LandingPage.css';
import ambulanceHero from '../assets/ambulance_hero.png';

const LandingPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            <header className="landing-header">
                <div className="landing-text">
                    <h1>{t('landing_title')}</h1>
                    <p>{t('landing_hero')}</p>
                    <button className="get-started-btn" onClick={() => navigate('/login')}>
                        {t('get_started')}
                    </button>
                </div>
                <div className="landing-image-container">
                    <img src={ambulanceHero} alt="Ambulance" className="floating-ambulance" />
                </div>
            </header>

            <section className="landing-grid">
                <div className="landing-card glass-effect">
                    <h2>{t('what_goes_wrong_title')}</h2>
                    <p>{t('what_goes_wrong_desc')}</p>
                </div>
                
                <div className="landing-card glass-effect">
                    <h2>{t('how_we_fix_it_title')}</h2>
                    <p>{t('how_we_fix_it_desc')}</p>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
