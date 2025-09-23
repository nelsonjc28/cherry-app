import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../config/axios';
import CustomButton from '../../components/CustomButton';
import { getIconPath } from '../../utils/assetPaths';
import useUserStore from '../../store/userStore';

const CheckoutForm = ({ cartItems = [], totalAmount = 0, onPaymentSuccess, onPaymentError }) => {
  const { token, user } = useUserStore();
  
  // Estados del formulario
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPaymentCardId, setSelectedPaymentCardId] = useState('');
  
  // Estados para mostrar formularios de agregar
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);

  // Cargar datos del checkout al montar el componente
  useEffect(() => {
    if (token) {
      loadCheckoutData();
    }
  }, [token]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/checkout/data');
      
      if (response.data.success) {
        const data = response.data.data;
        setCheckoutData(data);
        
        // Preseleccionar dirección y tarjeta por defecto
        if (data.default_address) {
          setSelectedAddressId(data.default_address.id.toString());
        }
        if (data.default_payment_card) {
          setSelectedPaymentCardId(data.default_payment_card.id.toString());
        }
      } else {
        throw new Error(response.data.message || 'Error al cargar datos del checkout');
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
      if (window.showToast) {
        window.showToast('Error al cargar los datos del checkout: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    // Validaciones
    if (!selectedAddressId) {
      if (window.showToast) {
        window.showToast('Por favor selecciona una dirección de envío', 'warning');
      }
      return;
    }

    if (!selectedPaymentCardId) {
      if (window.showToast) {
        window.showToast('Por favor selecciona una tarjeta de pago', 'warning');
      }
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      if (window.showToast) {
        window.showToast('No hay productos en el carrito', 'warning');
      }
      return;
    }

    if (totalAmount <= 0) {
      if (window.showToast) {
        window.showToast('El total debe ser mayor a cero', 'warning');
      }
      return;
    }

    try {
      setProcessing(true);
      
      const paymentData = {
        address_id: parseInt(selectedAddressId),
        payment_card_id: parseInt(selectedPaymentCardId),
        total_amount: totalAmount,
        items: cartItems.map(item => ({
          product_id: item.id_articulo || item.product_id || item.id,
          quantity: item.quantity,
          price: item.precio || item.price,
          name: item.title || item.name
        }))
      };

      const response = await api.post('/checkout/process', paymentData);
      
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('¡Pago procesado exitosamente!', 'success');
        }
        
        // Llamar callback de éxito o redirigir directamente
        if (onPaymentSuccess) {
          onPaymentSuccess(response.data);
        } else {
          // Redirigir a página de éxito si no hay callback
          setTimeout(() => {
            window.location.href = '/checkout/success';
          }, 2000);
        }
      } else {
        throw new Error(response.data.message || 'Error al procesar el pago');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
      
      // Llamar callback de error
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getCardIcon = (brand) => {
    const icons = {
      visa: 'visa-icon.svg',
      mastercard: 'mastercard-icon.svg',
      amex: 'amex-icon.svg',
      discover: 'discover-icon.svg',
      jcb: 'jcb-icon.svg',
      diners: 'diners-icon.svg'
    };
    return getIconPath(`payment/${icons[brand] || 'card-icon.svg'}`);
  };

  if (loading) {
    return (
      <div className="checkout-form-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando información del checkout...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="checkout-form-container">
        <div className="error-message">
          <p>Error al cargar los datos del checkout</p>
          <CustomButton variant="filled" onClick={loadCheckoutData}>Reintentar</CustomButton>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-form-container">
      <div className="checkout-form">
        <h2 className="checkout-title">Finalizar Compra</h2>

        {/* Información del Usuario */}
        <div className="checkout-section">
          <h3 className="section-title">Información Personal</h3>
          <div className="user-info">
            <div className="info-row">
              <span className="info-label">Nombre:</span>
              <span className="info-value">{checkoutData.user.full_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{checkoutData.user.email}</span>
            </div>
            {checkoutData.user.phone && (
              <div className="info-row">
                <span className="info-label">Teléfono:</span>
                <span className="info-value">{checkoutData.user.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dirección de Envío */}
        <div className="checkout-section">
          <div className="section-header">
            <h3 className="section-title">Dirección de Envío</h3>
            {!checkoutData.has_addresses && (
              <button 
                className="add-button"
                onClick={() => setShowAddAddressForm(true)}
              >
                + Agregar Dirección
              </button>
            )}
          </div>

          {checkoutData.has_addresses ? (
            <div className="address-selection">
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="address-select"
                required
              >
                <option value="">Selecciona una dirección</option>
                {checkoutData.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.name} - {address.full_address}
                  </option>
                ))}
              </select>
              
              {selectedAddressId && (
                <div className="selected-address-details">
                  {(() => {
                    const selectedAddress = checkoutData.addresses.find(
                      addr => addr.id.toString() === selectedAddressId
                    );
                    return selectedAddress ? (
                      <div className="address-card">
                        <h4>{selectedAddress.name}</h4>
                        <p>{selectedAddress.street_address}</p>
                        <p>{selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                        <p>{selectedAddress.country}</p>
                        {selectedAddress.additional_info && (
                          <p className="additional-info">{selectedAddress.additional_info}</p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              
              <button 
                className="add-button-secondary"
                onClick={() => setShowAddAddressForm(true)}
              >
                + Usar otra dirección
              </button>
            </div>
          ) : (
            <div className="no-addresses">
              <p>No tienes direcciones guardadas</p>
              <p>Agrega una dirección para continuar con tu compra</p>
            </div>
          )}
        </div>

        {/* Método de Pago */}
        <div className="checkout-section">
          <div className="section-header">
            <h3 className="section-title">Método de Pago</h3>
            {!checkoutData.has_payment_cards && (
              <button 
                className="add-button"
                onClick={() => setShowAddCardForm(true)}
              >
                + Agregar Tarjeta
              </button>
            )}
          </div>

          {checkoutData.has_payment_cards ? (
            <div className="payment-selection">
              <select
                value={selectedPaymentCardId}
                onChange={(e) => setSelectedPaymentCardId(e.target.value)}
                className="payment-select"
                required
              >
                <option value="">Selecciona una tarjeta</option>
                {checkoutData.payment_cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.brand_display_name} **** {card.masked_number.slice(-4)} - {card.cardholder_name}
                  </option>
                ))}
              </select>
              
              {selectedPaymentCardId && (
                <div className="selected-card-details">
                  {(() => {
                    const selectedCard = checkoutData.payment_cards.find(
                      card => card.id.toString() === selectedPaymentCardId
                    );
                    return selectedCard ? (
                      <div className="payment-card">
                        <div className="card-header">
                          <img 
                            src={getCardIcon(selectedCard.brand)} 
                            alt={selectedCard.brand_display_name}
                            className="card-icon"
                          />
                          <span className="card-brand">{selectedCard.brand_display_name}</span>
                          <span className="card-type">({selectedCard.card_type_display_name})</span>
                        </div>
                        <div className="card-details">
                          <p className="card-number">{selectedCard.masked_number}</p>
                          <p className="card-holder">{selectedCard.cardholder_name}</p>
                          <p className="card-expiry">Vence: {selectedCard.expiry_date}</p>
                          {selectedCard.is_expired && (
                            <p className="card-expired">⚠️ Esta tarjeta está expirada</p>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              
              <button 
                className="add-button-secondary"
                onClick={() => setShowAddCardForm(true)}
              >
                + Usar otra tarjeta
              </button>
            </div>
          ) : (
            <div className="no-payment-cards">
              <p>No tienes tarjetas de pago guardadas</p>
              <p>Agrega una tarjeta para continuar con tu compra</p>
            </div>
          )}
        </div>

        {/* Resumen del Pedido */}
        <div className="checkout-section">
          <h3 className="section-title">Resumen del Pedido</h3>
          <div className="order-summary">
            {cartItems && cartItems.length > 0 ? (
              <>
                {cartItems.map((item, index) => (
                  <div key={index} className="order-item">
                    <span className="item-name">{item.name || item.title}</span>
                    <span className="item-quantity">x{item.quantity}</span>
                    <span className="item-price">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="order-total">
                  <span className="total-label">Total:</span>
                  <span className="total-amount">{formatCurrency(totalAmount)}</span>
                </div>
              </>
            ) : (
              <p>No hay productos en el carrito</p>
            )}
          </div>
        </div>

        {/* Botón de Pago */}
        <div className="checkout-actions">
          <CustomButton
            variant="filled"
            onClick={handleProcessPayment}
            disabled={processing || !selectedAddressId || !selectedPaymentCardId || !cartItems?.length}
            className="pay-button"
          >
            {processing ? (
              <>
                <span className="spinner-small"></span>
                Procesando...
              </>
            ) : (
              `Pagar ${formatCurrency(totalAmount)}`
            )}
          </CustomButton>
        </div>
      </div>

      {/* Modales para agregar dirección/tarjeta */}
      {showAddAddressForm && (
        <div className="modal-overlay" onClick={() => setShowAddAddressForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p>Redirigiendo al formulario de direcciones...</p>
            <CustomButton variant="filled" onClick={() => setShowAddAddressForm(false)}>Cerrar</CustomButton>
          </div>
        </div>
      )}

      {showAddCardForm && (
        <div className="modal-overlay" onClick={() => setShowAddCardForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p>Redirigiendo al formulario de tarjetas...</p>
            <CustomButton variant="filled" onClick={() => setShowAddCardForm(false)}>Cerrar</CustomButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;
