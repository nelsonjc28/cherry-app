import React, { useState, useEffect } from 'react';
import CustomButton from '../CustomButton/CustomButton';
import api from '../../config/axios';
import './IntegratedCheckout.css';

const IntegratedCheckout = ({ 
  cartItems = [], 
  totalAmount = 0, 
  selectedAddress = null,
  selectedPaymentCard = null,
  onPaymentCardChange,
  onPaymentSuccess,
  onPaymentError 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentCards, setPaymentCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expirationDate: '',
    securityCode: '',
    cardholderName: '',
    installments: 1
  });
  const [errors, setErrors] = useState({});

  // Cargar MercadoPago SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = initializeMercadoPago;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Cargar tarjetas del usuario
  useEffect(() => {
    loadPaymentCards();
  }, []);

  // Auto-completar formulario cuando se selecciona una tarjeta
  useEffect(() => {
    if (selectedPaymentCard) {
      fillCardData(selectedPaymentCard);
    }
  }, [selectedPaymentCard]);

  const initializeMercadoPago = () => {
    // Inicializar MercadoPago con tu public key
    const publicKey = 'TEST-7741f243-19e3-4020-b9b4-5f8e955ba892'; // Tu public key
    window.mp = new window.MercadoPago(publicKey);
  };

  const loadPaymentCards = async () => {
    try {
      setIsLoadingCards(true);
      const response = await api.get('/payment-cards');
      
      if (response.data && Array.isArray(response.data)) {
        setPaymentCards(response.data);
      }
    } catch (error) {
      // Si no se pueden cargar las tarjetas, continuar sin ellas
      setPaymentCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const fillCardData = (card) => {
    if (!card) return;
    
    // Auto-completar los campos del formulario con los datos de la tarjeta
    setCardData(prev => ({
      ...prev,
      cardNumber: card.masked_number || '', // Número enmascarado
      expirationDate: card.expiry_date || '',
      cardholderName: card.cardholder_name || '',
      // CVV no se auto-completa por seguridad
      securityCode: ''
    }));
  };

  const handleCardSelection = (card) => {
    if (onPaymentCardChange) {
      onPaymentCardChange(card);
    }
  };

  const handleInputChange = (field, value) => {
    setCardData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!cardData.cardNumber || cardData.cardNumber.length < 15) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!cardData.expirationDate || !/^\d{2}\/\d{2}$/.test(cardData.expirationDate)) {
      newErrors.expirationDate = 'Fecha de vencimiento inválida (MM/YY)';
    }

    if (!cardData.securityCode || cardData.securityCode.length < 3) {
      newErrors.securityCode = 'Código de seguridad inválido';
    }

    if (!cardData.cardholderName || cardData.cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Nombre del titular requerido';
    }

    if (!selectedAddress) {
      newErrors.address = 'Selecciona una dirección de entrega';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const processPayment = async () => {
    if (!validateForm()) {
      return;
    }

    if (!window.mp) {
      if (window.showToast) {
        window.showToast('Error: MercadoPago no está cargado', 'error');
      }
      return;
    }

    setIsLoading(true);

    try {
      // Crear token de la tarjeta con MercadoPago
      const [month, year] = cardData.expirationDate.split('/');
      
      const cardToken = await window.mp.createCardToken({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: month,
        cardExpirationYear: '20' + year,
        securityCode: cardData.securityCode
      });

      if (cardToken.error) {
        throw new Error(cardToken.error.message || 'Error al procesar la tarjeta');
      }

      // Preparar datos para el backend
      const paymentData = {
        token: cardToken.id,
        payment_method_id: cardToken.payment_method_id,
        transaction_amount: totalAmount,
        installments: parseInt(cardData.installments),
        items: cartItems.map(item => ({
          product_id: String(item.id_articulo || item.product_id || item.id),
          name: item.title || item.name,
          quantity: item.quantity,
          price: item.precio || item.price,
          size: item.selectedSize || item.size || null,
          color: item.selectedColor || item.color || null,
          barcode: item.barcode || null,
          detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null
        })),
        address_id: selectedAddress.id
      };;

      // Enviar al backend
      const response = await api.post('/payment/process-integrated', paymentData);

      if (response.data.success) {
        if (window.showToast) {
          window.showToast('¡Pago procesado exitosamente!', 'success');
        }

        if (onPaymentSuccess) {
          onPaymentSuccess(response.data);
        }
      } else {
        throw new Error(response.data.message || 'Error al procesar el pago');
      }

    } catch (error) {
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }

      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpirationDate = (value) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="integrated-checkout">
      <div className="integrated-checkout__header">
        <h3>💳 Datos de la Tarjeta</h3>
      </div>

      <div className="integrated-checkout__form">
        {/* Selector de tarjetas guardadas */}
        {!isLoadingCards && paymentCards.length > 0 && (
          <div className="form-group">
            <label htmlFor="savedCards">Tarjetas Guardadas</label>
            <select
              id="savedCards"
              value={selectedPaymentCard?.id || ''}
              onChange={(e) => {
                const cardId = e.target.value;
                const card = cardId ? paymentCards.find(c => c.id === parseInt(cardId)) : null;
                handleCardSelection(card);
              }}
            >
              <option value="">Seleccionar tarjeta guardada o ingresar nueva</option>
              {paymentCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.brand_display_name} **** {card.masked_number?.slice(-4)} - {card.cardholder_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoadingCards && (
          <div className="loading-cards">
            <span>Cargando tarjetas guardadas...</span>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="cardNumber">Número de Tarjeta</label>
          <input
            type="text"
            id="cardNumber"
            value={cardData.cardNumber}
            onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            maxLength="19"
            className={errors.cardNumber ? 'error' : ''}
          />
          {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expirationDate">Vencimiento</label>
            <input
              type="text"
              id="expirationDate"
              value={cardData.expirationDate}
              onChange={(e) => handleInputChange('expirationDate', formatExpirationDate(e.target.value))}
              placeholder="MM/YY"
              maxLength="5"
              className={errors.expirationDate ? 'error' : ''}
            />
            {errors.expirationDate && <span className="error-text">{errors.expirationDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="securityCode">CVV</label>
            <input
              type="text"
              id="securityCode"
              value={cardData.securityCode}
              onChange={(e) => handleInputChange('securityCode', e.target.value.replace(/\D/g, ''))}
              placeholder="123"
              maxLength="4"
              className={errors.securityCode ? 'error' : ''}
            />
            {errors.securityCode && <span className="error-text">{errors.securityCode}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="cardholderName">Nombre del Titular</label>
          <input
            type="text"
            id="cardholderName"
            value={cardData.cardholderName}
            onChange={(e) => handleInputChange('cardholderName', e.target.value.toUpperCase())}
            placeholder="JUAN PÉREZ"
            className={errors.cardholderName ? 'error' : ''}
          />
          {errors.cardholderName && <span className="error-text">{errors.cardholderName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="installments">Cuotas</label>
          <select
            id="installments"
            value={cardData.installments}
            onChange={(e) => handleInputChange('installments', e.target.value)}
          >
            <option value="1">1 cuota sin interés</option>
            <option value="3">3 cuotas</option>
            <option value="6">6 cuotas</option>
            <option value="12">12 cuotas</option>
          </select>
        </div>

        {errors.address && <div className="error-text">{errors.address}</div>}

        <div className="integrated-checkout__summary">
          <div className="summary-row">
            <span>Total a pagar:</span>
            <strong>${totalAmount?.toFixed(2) || '0.00'} ARS</strong>
          </div>
        </div>

        <CustomButton
          variant="filled"
          size="large"
          onClick={processPayment}
          disabled={isLoading}
          className="integrated-checkout__pay-button"
        >
          {isLoading ? 'Procesando...' : `Pagar $${totalAmount?.toFixed(2) || '0.00'} ARS`}
        </CustomButton>
      </div>
    </div>
  );
};

export default IntegratedCheckout;
