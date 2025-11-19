import React, { useState, useEffect } from 'react';
import productCache from '../../utils/productCacheInMemory';
import './ProductCacheIndicator.css';

/**
 * Indicador visual del estado del caché de productos
 * 
 * Muestra:
 * - Si hay caché disponible
 * - Cuántos productos en caché
 * - Tiempo restante antes de expirar
 * - Botón para forzar actualización
 * 
 * Solo visible en desarrollo (opcional)
 */
const ProductCacheIndicator = ({ showInProduction = false }) => {
  const [cacheInfo, setCacheInfo] = useState({
    hasCache: false,
    productsCount: 0,
    isValid: false,
    ttlRemaining: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Actualizar info del caché cada 5 segundos
  useEffect(() => {
    const updateCacheInfo = () => {
      setCacheInfo(productCache.getCacheInfo());
    };

    updateCacheInfo();
    const intervalId = setInterval(updateCacheInfo, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await productCache.forceRefresh();
      setCacheInfo(productCache.getCacheInfo());
    } catch (error) {
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ocultar en producción si no se especifica lo contrario
  if (!showInProduction && import.meta.env.PROD) {
    return null;
  }

  const formatTTL = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className={`product-cache-indicator ${cacheInfo.isValid ? 'valid' : 'invalid'}`}>
      <div className="cache-status">
        <span className="cache-icon">
          {cacheInfo.isValid ? '✅' : '⏳'}
        </span>
        <div className="cache-details">
          <div className="cache-products">
            {cacheInfo.productsCount} productos
          </div>
          {cacheInfo.isValid && (
            <div className="cache-ttl">
              Expira en: {formatTTL(cacheInfo.ttlRemaining)}
            </div>
          )}
          {!cacheInfo.hasCache && (
            <div className="cache-loading">Cargando...</div>
          )}
        </div>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="cache-refresh-btn"
        title="Forzar actualización del caché"
      >
        {isRefreshing ? '🔄' : '↻'}
      </button>
    </div>
  );
};

export default ProductCacheIndicator;








