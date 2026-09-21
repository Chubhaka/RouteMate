import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Splash.css';
 
export default function Splash() {
  const navigate = useNavigate();
 
  useEffect(() => {
    const timer = setTimeout(() => {
      const isLoggedIn = localStorage.getItem('rm_auth');
      const onboarded  = localStorage.getItem('rm_onboarded');
      if (isLoggedIn && onboarded) {
        navigate('/home', { replace: true });
      } else if (isLoggedIn) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [navigate]);
 
  return (
    <div className="splash">
      <div className="splash__content">
        <div className="splash__logo-wrap">
          <div className="splash__icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#C7EF4E" />
              <path d="M12 24 Q18 14 24 20 Q30 26 36 16" stroke="#003310"
                strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="12" cy="24" r="3" fill="#003310"/>
              <circle cx="36" cy="16" r="3" fill="#003310"/>
            </svg>
          </div>
          <h1 className="splash__name">Route Mate</h1>
        </div>
        <p className="splash__tagline">Commuting, connected.</p>
      </div>
 
      <div className="splash__dots" aria-label="Loading">
        <span className="splash__dot splash__dot--1" />
        <span className="splash__dot splash__dot--2" />
        <span className="splash__dot splash__dot--3" />
      </div>
 
      <p className="splash__version">v1.0.0</p>
    </div>
  );
}