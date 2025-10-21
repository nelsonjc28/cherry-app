import React, { useState, useEffect } from 'react';
import './CacheIndicator.css';

/**
 * Indicador visual que muestra cuando los datos fueron cargados desde caché
 */
const CacheIndicator = ({ loadedFromCache, autoHide = true, duration = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loadedFromCache) {
      setVisible(true);

      if (autoHide) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [loadedFromCache, autoHide, duration]);

  if (!visible || !loadedFromCache) return null;

  return (
    <div className="cache-indicator">
      <div className="cache-indicator-content">
        <svg
          className="cache-indicator-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span className="cache-indicator-text">
          Carga instantánea desde caché
        </span>
      </div>
    </div>
  );
};

export default CacheIndicator;





