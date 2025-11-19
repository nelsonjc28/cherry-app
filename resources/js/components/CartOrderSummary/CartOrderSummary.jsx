import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './CartOrderSummary.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';
import api from '../../config/axios';
import { validateStock } from '../../services/inventoryService';

const CartOrderSummary = ({
  creditDays,
  discount1,
  discount2,
  pieces,
  subtotal,
  discountTotal,
  total,
  selectedAddress,
  onGenerateOrder,
  onClearCart,
  daysFortyFive,
  // Nuevas props para el formulario integrado
  cartItems = [],
  selectedPaymentCard = null,
  onPaymentCardChange,
  onIntegratedPaymentSuccess,
  onIntegratedPaymentError
}) => {
  const [paymentCards, setPaymentCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsVersion, setCardsVersion] = useState(0); // Para forzar re-render
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expirationDate: '',
    securityCode: '',
    cardholderName: '',
    installments: 1
  });
  const [modalCardData, setModalCardData] = useState({
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    securityCode: '',
    cardholderName: ''
  });
  const [errors, setErrors] = useState({});
  const [modalErrors, setModalErrors] = useState({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);


  // Cargar MercadoPago SDK
  useEffect(() => {
    const loadMercadoPagoSDK = async () => {
      try {
        // Obtener configuración de MercadoPago del backend
        const configResponse = await api.get('/mercadopago/config');
        const publicKey = configResponse.data.public_key;

        if (!publicKey) {
          throw new Error('No se pudo obtener la clave pública de MercadoPago');
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {

          window.mp = new window.MercadoPago(publicKey);

        };
        document.body.appendChild(script);

        return () => {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
        };
      } catch (error) {

        // Fallback a la clave hardcodeada
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          const fallbackKey = 'TEST-7741f243-19e3-4020-b9b4-5f8e955ba892';

          window.mp = new window.MercadoPago(fallbackKey);

        };
        document.body.appendChild(script);
      }
    };

    loadMercadoPagoSDK();
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

  const loadPaymentCards = async () => {
    try {
      setIsLoadingCards(true);

      // Verificar si hay token de autenticación
      const token = localStorage.getItem('token');

      const response = await api.get('/payment-cards');

      if (response.data && response.data.success && Array.isArray(response.data.cards)) {
        setPaymentCards(response.data.cards);
        setCardsVersion(prev => prev + 1); // Forzar re-render

      } else {

        setPaymentCards([]);
        setCardsVersion(prev => prev + 1); // Forzar re-render
      }
    } catch (error) {

      if (error.response?.status === 401) {

      } else if (error.response?.status === 403) {

      }

      setPaymentCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const fillCardData = (card) => {
    if (!card) {
      // Limpiar formulario si no hay tarjeta seleccionada
      setCardData(prev => ({
        ...prev,
        cardNumber: '',
        expirationDate: '',
        cardholderName: '',
        securityCode: ''
      }));
      return;
    }

    // Formatear el número de tarjeta con espacios
    const formattedNumber = card.full_number ?
      card.full_number.replace(/(.{4})/g, '$1 ').trim() : '';

    setCardData(prev => ({
      ...prev,
      cardNumber: formattedNumber,
      expirationDate: card.expiry_date || '',
      cardholderName: card.cardholder_name || '',
      securityCode: card.cvv || ''
    }));
  };

  const handleCardSelection = (card) => {
    if (onPaymentCardChange) {
      onPaymentCardChange(card);
    }
  };

  const saveNewCard = async (cardDataToSave) => {
    try {
      setIsSavingCard(true);

      // Usar mes y año directamente de los campos separados
      const month = cardDataToSave.expirationMonth;
      const year = '20' + cardDataToSave.expirationYear; // Convertir YY a YYYY

      // Detectar marca de la tarjeta basado en el número
      const cardNumber = cardDataToSave.cardNumber.replace(/\s/g, '');
      let brand = 'visa'; // default

      if (cardNumber.startsWith('4')) {
        brand = 'visa';
      } else if (cardNumber.startsWith('5') || (cardNumber.startsWith('2') && cardNumber.length >= 2 && cardNumber.substring(0, 2) >= '22' && cardNumber.substring(0, 2) <= '27')) {
        brand = 'mastercard';
      } else if (cardNumber.startsWith('34') || cardNumber.startsWith('37')) {
        brand = 'amex';
      } else if (cardNumber.startsWith('6011') || cardNumber.startsWith('65')) {
        brand = 'discover';
      }

      const cardPayload = {
        cardholder_name: cardDataToSave.cardholderName,
        card_number: cardNumber,
        expiry_month: month.padStart(2, '0'), // Asegurar formato MM
        expiry_year: year,
        cvv: cardDataToSave.securityCode,
        brand: brand,
        card_type: 'credit', // Default a credit
        is_default: paymentCards.length === 0 // Primera tarjeta es default
      };

      const response = await api.post('/payment-cards', cardPayload);

      if (response.data && response.data.success) {

        // Recargar tarjetas

        await loadPaymentCards();

        // Seleccionar la nueva tarjeta
        const newCard = response.data.card;

        if (newCard && onPaymentCardChange) {
          onPaymentCardChange(newCard);
        }

        if (window.showToast) {
          window.showToast('Tarjeta guardada exitosamente', 'success');
        }

        setShowAddCardModal(false);
        return true;
      } else {
        throw new Error(response.data.message || 'Error al guardar la tarjeta');
      }
    } catch (error) {

      const errorMessage = error.response?.data?.message || error.message || 'Error al guardar la tarjeta';

      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }

      return false;
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleModalInputChange = (field, value) => {
    setModalCardData(prev => ({
      ...prev,
      [field]: value
    }));

    if (modalErrors[field]) {
      setModalErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateModalForm = () => {
    const newErrors = {};

    if (!modalCardData.cardNumber || modalCardData.cardNumber.length < 15) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }

    if (!modalCardData.expirationMonth || !/^\d{2}$/.test(modalCardData.expirationMonth) ||
      parseInt(modalCardData.expirationMonth) < 1 || parseInt(modalCardData.expirationMonth) > 12) {
      newErrors.expirationMonth = 'Mes inválido (01-12)';
    }

    if (!modalCardData.expirationYear || !/^\d{2}$/.test(modalCardData.expirationYear)) {
      newErrors.expirationYear = 'Año inválido (debe ser 2 dígitos)';
    }

    if (!modalCardData.securityCode || modalCardData.securityCode.length < 3) {
      newErrors.securityCode = 'Código de seguridad inválido';
    }

    if (!modalCardData.cardholderName || modalCardData.cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Nombre del titular requerido';
    }

    setModalErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModalSave = async () => {
    if (!validateModalForm()) {
      return;
    }

    const success = await saveNewCard(modalCardData);
    if (success) {
      // Limpiar formulario del modal después de guardar
      setModalCardData({
        cardNumber: '',
        expirationMonth: '',
        expirationYear: '',
        securityCode: '',
        cardholderName: ''
      });
      setModalErrors({});
    }
  };

  const handleCloseModal = () => {
    setShowAddCardModal(false);
    // Limpiar errores del modal
    setModalErrors({});
    // Opcionalmente limpiar datos del modal
    setModalCardData({
      cardNumber: '',
      expirationMonth: '',
      expirationYear: '',
      securityCode: '',
      cardholderName: ''
    });
  };

  const handleInputChange = (field, value) => {
    setCardData(prev => ({
      ...prev,
      [field]: value
    }));

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

  const processIntegratedPayment = async () => {
    if (!validateForm()) {
      return;
    }

    const canContinue = await validateCartBeforeOrder();
    if (!canContinue) {
      // Detener compra
      if (window.showToast) {
        window.showToast('Se ajustaron cantidades según stock disponible. Revisa el carrito.', 'error');
      }
      return; // ← Esto detiene la compra
    }

    if (!window.mp) {
      if (window.showToast) {
        window.showToast('Error: MercadoPago no está cargado', 'error');
      }
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Formatear correctamente la fecha de expiración
      const [month, year] = cardData.expirationDate.split('/');

      // Asegurar que el mes tenga formato MM (dos dígitos)
      const formattedMonth = month.padStart(2, '0');
      // Asegurar que el año tenga formato YYYY (cuatro dígitos)
      const formattedYear = year.length === 2 ? '20' + year : year;

      // Primero obtener el payment method ID basado en el número de tarjeta
      const cardNumber = cardData.cardNumber.replace(/\s/g, '');

      let paymentMethodId;

      // Detección manual del método de pago
      if (cardNumber.startsWith('4')) {
        paymentMethodId = 'visa';
      } else if (cardNumber.startsWith('5')) {
        paymentMethodId = 'master';
      } else if (cardNumber.startsWith('34') || cardNumber.startsWith('37')) {
        paymentMethodId = 'amex';
      } else {
        paymentMethodId = 'visa'; // default
      }


      // Crear el token de tarjeta con MercadoPago
      const cardToken = await window.mp.createCardToken({
        cardNumber: cardNumber,
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: formattedMonth,
        cardExpirationYear: formattedYear,
        securityCode: cardData.securityCode
      });

      // Verificar si hay errores en el cardToken (puede venir como array de errores)
      if (cardToken.error || (Array.isArray(cardToken) && cardToken.length > 0 && cardToken[0].code)) {
        const error = cardToken.error || cardToken[0];

        // Mostrar error amigable con toast
        let errorMessage = 'Error al procesar la tarjeta';

        if (error.code === '325') {
          errorMessage = 'Fecha de vencimiento inválida. Verifica el formato MM/YY';
        } else if (error.code === '324') {
          errorMessage = 'Código de seguridad inválido';
        } else if (error.code === '316') {
          errorMessage = 'Nombre del titular inválido';
        } else if (error.code === '205') {
          errorMessage = 'Número de tarjeta inválido';
        } else if (error.message) {
          errorMessage = error.message;
        }

        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }

        setIsProcessingPayment(false);
        return;
      }

      // Usar el payment_method_id que detectamos previamente
      // Si el cardToken tiene payment_method_id, usarlo, sino usar el que detectamos
      const finalPaymentMethodId = cardToken.payment_method_id || paymentMethodId;

      if (!finalPaymentMethodId) {

        if (window.showToast) {
          window.showToast('No se pudo obtener el método de pago de la tarjeta', 'error');
        }

        setIsProcessingPayment(false);
        return;
      }

      const paymentData = {
        token: cardToken.id,
        payment_method_id: finalPaymentMethodId,
        transaction_amount: parseFloat(finalTotal),
        installments: 1, // Siempre 1 cuota
        items: cartItems.map(item => {
          const productId = item.id_articulo || item.product_id || item.id;
          const parsedProductId = parseInt(productId, 10);

          const mappedItem = {
            product_id: parsedProductId,
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null
          };

          // DEBUG: Log para ver qué datos se están enviando
          return mappedItem;
        }),
        address_id: parseInt(selectedAddress.id, 10)
      };

      // ⚠️ SIN TRY-CATCH - Esto permitirá ver errores exactos del backend
      const response = await api.post('/payment/process-integrated', paymentData);

      if (response.data.success) {
        if (window.showToast) {
          window.showToast('¡Pago procesado exitosamente!', 'success');
        }

        if (onIntegratedPaymentSuccess) {
          onIntegratedPaymentSuccess(response.data);
        }
      } else {

        if (window.showToast) {
          window.showToast(response.data.message || 'Error al procesar el pago', 'error');
        }

        if (onIntegratedPaymentError) {
          onIntegratedPaymentError(response.data);
        }
      }

      setIsProcessingPayment(false);
    } catch (error) {

      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al procesar el pago';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }

      if (onIntegratedPaymentError) {
        onIntegratedPaymentError(error);
      }

      setIsProcessingPayment(false);
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

  const formatExpirationMonth = (value) => {
    const v = value.replace(/\D/g, '');
    return v.substring(0, 2);
  };

  const formatExpirationYear = (value) => {
    const v = value.replace(/\D/g, '');
    return v.substring(0, 2);
  };


  // ===== DESCUENTO POR DAYS 45 + TOTAL + desc_promo =====
  let finalTotal = Number(total);

  // 1️⃣ Verificar que todos los productos tienen desc_promo = 0/null
  const allWithoutPromo = cartItems.every(item =>
    item.desc_promo === 0 ||
    item.desc_promo === null ||
    item.desc_promo === undefined
  );

  // 2️⃣ Validar daysFortyFive
  const hasDays45 = Boolean(daysFortyFive);

  // 3️⃣ Aplicar descuentos según el total
  if (allWithoutPromo && hasDays45) {

    if (finalTotal > 15000) {
      finalTotal = finalTotal * 0.60; // 40% descuento
    } else if (finalTotal > 7000) {
      finalTotal = finalTotal * 0.70; // 30% descuento
    }

    finalTotal = finalTotal.toFixed(2)
  }

  let envio = 0;
  if (finalTotal < 3000) {
    finalTotal = finalTotal + 150;
    envio = 150;
  }

  const validateCartBeforeOrder = async () => {
    let hasErrors = false;

    window.showToast(
      `Validando disponibilidad de las prendas.`,
      "info"
    );
    // Recorremos todo el carrito
    for (const item of cartItems) {

      const productId = item.id_articulo;
      const size = item.selectedSize;
      const color = item.selectedColor;
      const requestedQuantity = item.quantity;



      try {
        const stockValidation = await validateStock(
          productId,
          size,
          color,
          requestedQuantity
        );

        if (!stockValidation.isValid) {
          hasErrors = true;

          if (window.showToast) {
            window.showToast(
              `El producto ${productId} (${color} / ${size}) tiene solo ${stockValidation.availableStock} en stock.`,
              "error"
            );
          }

          // Si hay stock disponible, ajustar la cantidad
          if (stockValidation.availableStock > 0) {
            updateQuantity(
              productId,
              stockValidation.availableStock,
              color,
              size
            );
          } else {
            // Si NO hay stock disponible → remover del carrito
            removeItem(productId, color, size);
          }
        }
      } catch (error) {

        if (window.showToast) {
          window.showToast(`Error al validar stock del producto ${productId}`, "error");
        }

        hasErrors = true;
      }
    }

    return !hasErrors; // true si todo está bien, false si hubo problemas
  };

  return (
    <aside className="cart-order-summary">
      {selectedAddress && (
        <>
          <div className="cart-order-summary__section">
            <div className="cart-order-summary__section-title">Dirección de entrega</div>
            <div className="cart-order-summary__section-content">
              <div className="cart-order-summary__address-name">
                <strong>{selectedAddress.name}</strong>
                {selectedAddress.is_default && (
                  <span className="cart-order-summary__default-badge">Predeterminada</span>
                )}
              </div>
              <div className="cart-order-summary__address-street">
                {selectedAddress.street_address}
              </div>
              <div className="cart-order-summary__address-location">
                {selectedAddress.city}
                {selectedAddress.state && `, ${selectedAddress.state}`}
                {selectedAddress.postal_code && ` CP: ${selectedAddress.postal_code}`}
                {selectedAddress.country && `, ${selectedAddress.country}`}
              </div>
              {selectedAddress.additional_info && (
                <div className="cart-order-summary__address-additional">
                  <small>{selectedAddress.additional_info}</small>
                </div>
              )}
            </div>
          </div>
          <div className="cart-order-summary__divider" />
        </>
      )}
      <div className="cart-order-summary__section">
        <div className="cart-order-summary__section-title">Monto del pedido</div>
        <div className="cart-order-summary__section-content">
          <div className="cart-order-summary__row">
            <span>Cantidad de piezas</span>
            <span>{pieces}</span>
          </div>
          <div className="cart-order-summary__row">
            <span>Sub-Total</span>
            <span>${subtotal}</span>
          </div>
          <div className="cart-order-summary__row">
            <span>Descuento:</span>
            <span>${discountTotal}</span>
          </div>
          <div className="cart-order-summary__row">
            <span>Envio:</span>
            <span>${envio}</span>
          </div>
        </div>
        <div className="cart-order-summary__total-row">
          <span>Total:</span>
          <span className="cart-order-summary__total-value">${finalTotal}</span>
        </div>
      </div>

      {/* Formulario de tarjeta integrado */}
      <div className="cart-order-summary__divider" />
      <div className="cart-order-summary__section payment-method-section">
        <div className="cart-order-summary__section-title section-title-flex">
          <span className="cart-order-summary__card-icon">💳</span>
          <span>Datos de la Tarjeta</span>
        </div>
        <div className="cart-order-summary__section-content payment-method-content">

          {/* Selector de tarjetas guardadas con botón + */}
          <div className="form-group">
            <label htmlFor="savedCards" className="saved-cards-title">Tarjetas Guardadas</label>
            {isLoadingCards ? (
              <div className="loading-cards">
                <span>Cargando tarjetas guardadas...</span>
              </div>
            ) : (
              <div className="saved-cards-selector">
                <select
                  id="savedCards"
                  key={`cards-${cardsVersion}`}
                  value={selectedPaymentCard?.id || ''}
                  onChange={(e) => {
                    const cardId = e.target.value;
                    const card = cardId ? paymentCards.find(c => c.id === parseInt(cardId)) : null;
                    handleCardSelection(card);
                  }}
                >
                  <option value="">
                    {paymentCards.length > 0
                      ? "Selecciona una tarjeta"
                      : "No hay tarjetas guardadas - Ingresar nueva"
                    }
                  </option>
                  {paymentCards.map(card => (
                    <option key={card.id} value={card.id}>
                      {card.brand_display_name} **** {card.last_four} - {card.cardholder_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-card-btn"
                  onClick={() => setShowAddCardModal(true)}
                  title="Agregar nueva tarjeta"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Campos del formulario */}
          <div className="form-group input-with-icon">
            <input
              type="text"
              id="cardNumber"
              value={cardData.cardNumber}
              onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
              placeholder="Número de Tarjeta"
              maxLength="19"
              className="input-with-right-icon"
            />
            <span className="input-icon lock-icon">🔒</span>
            {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                id="expirationDate"
                value={cardData.expirationDate}
                onChange={(e) => handleInputChange('expirationDate', formatExpirationDate(e.target.value))}
                placeholder="Fecha de vencimiento (MM/YY)"
                maxLength="5"
              />
              {errors.expirationDate && <span className="error-message">{errors.expirationDate}</span>}
            </div>

            <div className="form-group">
              <input
                type="text"
                id="securityCode"
                value={cardData.securityCode}
                onChange={(e) => handleInputChange('securityCode', e.target.value.replace(/\D/g, '').substring(0, 4))}
                placeholder="Código de seguridad"
                maxLength="4"
              />
              {errors.securityCode && <span className="error-message">{errors.securityCode}</span>}
            </div>
          </div>

          <div className="form-group">
            <input
              type="text"
              id="cardholderName"
              value={cardData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value.toUpperCase())}
              placeholder="Nombre del titular"
            />
            {errors.cardholderName && <span className="error-message">{errors.cardholderName}</span>}
          </div>

          {/* Campo oculto para cuotas (siempre 1) */}
          <input type="hidden" name="installments" value="1" />

          {errors.address && <div className="error-message">{errors.address}</div>}
        </div>
      </div>

      {/* Modal para agregar nueva tarjeta */}
      {showAddCardModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="section-title-flex">
                <span className="cart-order-summary__card-icon">💳</span>
                <h3>Agregar Nueva Tarjeta</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <input
                  type="text"
                  id="modalCardNumber"
                  value={modalCardData.cardNumber}
                  onChange={(e) => handleModalInputChange('cardNumber', formatCardNumber(e.target.value))}
                  placeholder="Número de Tarjeta"
                  maxLength="19"
                />
                {modalErrors.cardNumber && <span className="error-message">{modalErrors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    id="modalExpirationMonth"
                    value={modalCardData.expirationMonth}
                    onChange={(e) => handleModalInputChange('expirationMonth', formatExpirationMonth(e.target.value))}
                    placeholder="Mes (MM)"
                    maxLength="2"
                  />
                  {modalErrors.expirationMonth && <span className="error-message">{modalErrors.expirationMonth}</span>}
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    id="modalExpirationYear"
                    value={modalCardData.expirationYear}
                    onChange={(e) => handleModalInputChange('expirationYear', formatExpirationYear(e.target.value))}
                    placeholder="Año (YY)"
                    maxLength="2"
                  />
                  {modalErrors.expirationYear && <span className="error-message">{modalErrors.expirationYear}</span>}
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    id="modalSecurityCode"
                    value={modalCardData.securityCode}
                    onChange={(e) => handleModalInputChange('securityCode', e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="Código de seguridad"
                    maxLength="4"
                  />
                  {modalErrors.securityCode && <span className="error-message">{modalErrors.securityCode}</span>}
                </div>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  id="modalCardholderName"
                  value={modalCardData.cardholderName}
                  onChange={(e) => handleModalInputChange('cardholderName', e.target.value.toUpperCase())}
                  placeholder="Nombre del titular"
                />
                {modalErrors.cardholderName && <span className="error-message">{modalErrors.cardholderName}</span>}
              </div>
            </div>

            <div className="modal-footer">
              <CustomButton
                variant="outlined"
                size="small"
                onClick={handleCloseModal}
                className="modal-cancel-btn"
              >
                Cancelar
              </CustomButton>
              <CustomButton
                variant="filled"
                size="small"
                onClick={handleModalSave}
                disabled={isSavingCard}
                className="modal-save-btn"
              >
                {isSavingCard ? 'Guardando...' : 'Guardar Tarjeta'}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      <div className="cart-order-summary__divider" />
      <div className="cart-order-summary__actions">
        <CustomButton
          variant="outlined"
          size="small"
          onClick={processIntegratedPayment}
          disabled={isProcessingPayment}
          iconLeft={<img className="cart-order-summary__generate-icon" src={getIconPath('Handshake.svg')} alt="Handshake" />}
          className="cart-order-summary__summary-btn"
        >
          {isProcessingPayment ? 'Procesando pago...' : 'Generar pedido'}
        </CustomButton>
        <CustomButton
          variant="outlined"
          size="small"
          onClick={onClearCart}
          className="cart-order-summary__summary-btn cart-order-summary__empty-btn"
        >
          Vaciar carrito
        </CustomButton>
      </div>
    </aside>
  );
};

CartOrderSummary.propTypes = {
  creditDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount1: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClearCart: PropTypes.func.isRequired,
  onGenerateOrder: PropTypes.func.isRequired,
  pieces: PropTypes.number.isRequired,
  selectedAddress: PropTypes.object,
  subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  // Nuevas props para el formulario integrado
  cartItems: PropTypes.array,
  selectedPaymentCard: PropTypes.object,
  onPaymentCardChange: PropTypes.func,
  onIntegratedPaymentSuccess: PropTypes.func,
  onIntegratedPaymentError: PropTypes.func
};


export default CartOrderSummary; 
