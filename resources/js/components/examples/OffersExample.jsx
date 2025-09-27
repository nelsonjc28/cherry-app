import React, { useState, useEffect } from 'react';
import { 
  getSmartPromoProducts,
  getExternalPromoProducts, 
  getPromoProducts,
  isUserSessionActive 
} from '../../api/cherryApi';

/**
 * Ejemplo de componente que muestra ofertas con el nuevo sistema separado
 */
const OffersExample = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [mode, setMode] = useState('smart'); // 'smart', 'external', 'user'

  useEffect(() => {
    // Verificar estado de sesión al montar el componente
    setSessionActive(isUserSessionActive());
  }, []);

  const loadOffers = async (selectedMode = mode) => {
    setLoading(true);
    try {
      let result = [];
      
      switch (selectedMode) {
        case 'smart':
          // Modo recomendado: automático según sesión
          result = await getSmartPromoProducts(20);
          console.log('🤖 Modo inteligente - ofertas cargadas automáticamente');
          break;
          
        case 'external':
          // Solo ofertas externas (sin sesión)
          result = await getExternalPromoProducts(20);
          console.log('🔓 Modo externo - solo ofertas de API externa');
          break;
          
        case 'user':
          // Ofertas con sesión (incluye personalizadas)
          if (sessionActive) {
            result = await getPromoProducts(20);
            console.log('🔐 Modo usuario - ofertas con descuentos personalizados');
          } else {
            console.warn('⚠️ No hay sesión activa, usando ofertas externas');
            result = await getExternalPromoProducts(20);
          }
          break;
          
        default:
          result = await getSmartPromoProducts(20);
      }
      
      setOffers(result);
    } catch (error) {
      console.error('❌ Error cargando ofertas:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, [mode]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const refreshOffers = () => {
    setSessionActive(isUserSessionActive());
    loadOffers();
  };

  return (
    <div className="offers-example p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">
          Sistema de Ofertas - Ejemplo de Uso
        </h2>
        
        {/* Estado de Sesión */}
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">Estado de Sesión: </span>
              <span className={`px-2 py-1 rounded text-sm ${
                sessionActive 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {sessionActive ? '🔐 Activa' : '🔓 Inactiva'}
              </span>
            </div>
            <button 
              onClick={refreshOffers}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              🔄 Refrescar
            </button>
          </div>
        </div>

        {/* Selector de Modo */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Modo de Carga:</h3>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="smart"
                checked={mode === 'smart'}
                onChange={(e) => handleModeChange(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">
                🤖 <strong>Inteligente</strong> (Recomendado)
                <br />
                <small className="text-gray-600">Automático según sesión</small>
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="external"
                checked={mode === 'external'}
                onChange={(e) => handleModeChange(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">
                🔓 <strong>Solo Externas</strong>
                <br />
                <small className="text-gray-600">Sin ofertas personalizadas</small>
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                value="user"
                checked={mode === 'user'}
                onChange={(e) => handleModeChange(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">
                🔐 <strong>Con Sesión</strong>
                <br />
                <small className="text-gray-600">Incluye ofertas personalizadas</small>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Ofertas Cargadas ({offers.length})
          </h3>
          {loading && (
            <div className="text-blue-600">
              ⏳ Cargando ofertas...
            </div>
          )}
        </div>

        {/* Grid de Productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {offers.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="mb-3">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded"
                  onError={(e) => {
                    e.target.src = '/images/placeholder-product.jpg';
                  }}
                />
              </div>
              
              <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                {product.title}
              </h4>
              
              <div className="mb-2">
                {product.originalPrice && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">
                      ${product.price?.toFixed(2)}
                    </span>
                    <span className="text-gray-500 line-through text-sm">
                      ${product.originalPrice?.toFixed(2)}
                    </span>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      -{product.discount}%
                    </span>
                  </div>
                )}
                {!product.originalPrice && (
                  <span className="text-gray-800 font-bold">
                    ${product.price?.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Indicadores de Ofertas */}
              <div className="flex flex-wrap gap-1 mb-2">
                {product.discount && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                    🏷️ API: {product.discount}%
                  </span>
                )}
                {product.hasUserOffer && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    👤 Usuario: {product.userOffer?.percentage}%
                  </span>
                )}
                {product.isPromo && (
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    🎯 Promo
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-600">
                <div>Stock: {product.stock}</div>
                <div>Rating: {product.rating}/5 ({product.ratingCount})</div>
              </div>
            </div>
          ))}
        </div>

        {offers.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-600">
            <p>😔 No se encontraron ofertas disponibles</p>
            <p className="text-sm mt-2">
              Intenta cambiar el modo de carga o verifica tu conexión
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OffersExample;
