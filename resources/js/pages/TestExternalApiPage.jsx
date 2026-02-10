import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import CherryButton from '../components/CherryButton/CherryButton';
import './TestExternalApiPage.css';

const TestExternalApiPage = () => {
  const [cartInfo, setCartInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [deliveryType, setDeliveryType] = useState('envio');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCartInfo();
  }, []);

  const fetchCartInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test-external-api/cart-info');
      
      if (response.data.success) {
        setCartInfo(response.data);
      } else {
        setError(response.data.message || 'Error al cargar información del carrito');
      }
    } catch (err) {
      setError('Error de conexión al cargar información del carrito');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPayment = async () => {
    if (!cartInfo?.cart || !cartInfo.cart.items || cartInfo.cart.items.length === 0) {
      setError('El carrito está vacío. Agrega productos al carrito primero.');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setResult(null);

      const response = await api.post('/test-external-api/test-payment', {
        order_id: '00000069', // Orden por defecto para pruebas
        delivery_type: deliveryType
      });

      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          order: response.data.order,
          cart: response.data.cart,
          note: response.data.note
        });
      } else {
        setResult({
          success: false,
          message: response.data.message
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al enviar prueba a la API externa');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="test-external-api-page">
        <div className="container">
          <div className="test-external-api-loading">
            <p>Cargando información del carrito...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-external-api-page">
      <div className="container">
        <div className="test-external-api-header">
          <h1>Prueba de Envío a API Externa</h1>
          <p className="test-external-api-subtitle">
            Esta página permite probar el envío de información de pago a la API externa
            usando los productos que tienes actualmente en tu carrito.
          </p>
        </div>

        {error && (
          <div className="test-external-api-alert test-external-api-alert--error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {cartInfo && (
          <div className="test-external-api-content">
            {/* Información del usuario */}
            <div className="test-external-api-section">
              <h2>Información del Usuario</h2>
              <div className="test-external-api-info">
                <div className="info-row">
                  <span className="label">Nombre:</span>
                  <span className="value">{cartInfo.user.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{cartInfo.user.email}</span>
                </div>
              </div>
            </div>

            {/* Información del carrito */}
            {cartInfo.cart ? (
              <div className="test-external-api-section">
                <h2>Productos en el Carrito</h2>
                <div className="test-external-api-cart-summary">
                  <div className="info-row">
                    <span className="label">Total de productos:</span>
                    <span className="value">{cartInfo.cart.total_items} piezas</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Total:</span>
                    <span className="value">${parseFloat(cartInfo.cart.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="test-external-api-items">
                  <h3>Items del Carrito:</h3>
                  <div className="items-list">
                    {cartInfo.cart.items.map((item, index) => (
                      <div key={index} className="item-card">
                        <div className="item-info">
                          <div className="item-title">{item.title || item.name || 'Producto'}</div>
                          <div className="item-details">
                            <span>ID: {item.id_articulo || item.product_id || 'N/A'}</span>
                            <span>Cantidad: {item.quantity || 0}</span>
                            <span>Precio: ${parseFloat(item.precio || item.price || 0).toFixed(2)}</span>
                            {item.selectedSize && <span>Talla: {item.selectedSize}</span>}
                            {item.selectedColor && <span>Color: {item.selectedColor}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="test-external-api-section">
                <div className="test-external-api-alert test-external-api-alert--warning">
                  <span className="alert-icon">⚠️</span>
                  <span>Tu carrito está vacío. Agrega productos al carrito antes de probar.</span>
                </div>
                <CherryButton
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Ir a Productos
                </CherryButton>
              </div>
            )}

            {/* Opciones de prueba */}
            {cartInfo.cart && cartInfo.cart.items && cartInfo.cart.items.length > 0 && (
              <div className="test-external-api-section">
                <h2>Opciones de Prueba</h2>
                <div className="test-external-api-options">
                  <div className="option-group">
                    <label>Tipo de Entrega:</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="envio"
                          checked={deliveryType === 'envio'}
                          onChange={(e) => setDeliveryType(e.target.value)}
                        />
                        <span>Envío a domicilio</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="retiro"
                          checked={deliveryType === 'retiro'}
                          onChange={(e) => setDeliveryType(e.target.value)}
                        />
                        <span>Retiro en tienda</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="test-external-api-actions">
                  <CherryButton
                    variant="red"
                    size="large"
                    onClick={handleTestPayment}
                    disabled={testing}
                  >
                    {testing ? 'Enviando...' : 'Probar Envío a API Externa'}
                  </CherryButton>
                </div>
              </div>
            )}

            {/* Resultado */}
            {result && (
              <div className="test-external-api-section">
                <h2>Resultado de la Prueba</h2>
                <div className={`test-external-api-result ${result.success ? 'success' : 'error'}`}>
                  <div className="result-header">
                    <span className="result-icon">{result.success ? '✅' : '❌'}</span>
                    <span className="result-message">{result.message}</span>
                  </div>

                  {result.order && (
                    <div className="result-details">
                      <h3>Información de la Orden Creada:</h3>
                      <div className="info-row">
                        <span className="label">Número de orden:</span>
                        <span className="value">#{result.order.orderNumber}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Total:</span>
                        <span className="value">${parseFloat(result.order.total_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Items:</span>
                        <span className="value">{result.order.items_count}</span>
                      </div>
                      {result.api_url && (
                        <div className="info-row">
                          <span className="label">URL de API:</span>
                          <span className="value" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{result.api_url}</span>
                        </div>
                      )}
                      {result.api_response && result.api_response.details && (
                        <div className="result-api-details">
                          <h4>Detalles de la Respuesta de la API:</h4>
                          <pre className="api-details-pre">
                            {JSON.stringify(result.api_response.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {result.note && (
                        <div className="result-note">
                          <strong>Nota:</strong> {result.note}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestExternalApiPage;

