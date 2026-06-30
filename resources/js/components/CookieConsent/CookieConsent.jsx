import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCookieConsent,
  isGa4Configured,
  setCookieConsent,
} from '../../utils/analytics';
import './CookieConsent.css';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isGa4Configured()) return;
    setVisible(getCookieConsent() === null);
  }, []);

  if (!visible) return null;

  const accept = () => {
    setCookieConsent({ analytics: true, marketing: false });
    setVisible(false);
  };

  const reject = () => {
    setCookieConsent({ analytics: false, marketing: false });
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Consentimiento de cookies">
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">
          Usamos cookies de analítica (Google Analytics) para entender cómo se usa el sitio y mejorar tu experiencia.
          {' '}
          <Link to="/cookies">Más información</Link>
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="cookie-consent__btn cookie-consent__btn--secondary" onClick={reject}>
            Rechazar
          </button>
          <button type="button" className="cookie-consent__btn cookie-consent__btn--primary" onClick={accept}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
