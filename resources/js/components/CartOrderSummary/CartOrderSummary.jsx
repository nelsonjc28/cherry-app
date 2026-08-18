import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './CartOrderSummary.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';
import api from '../../config/axios';
import { validateStock, clearInventoryCache } from '../../services/inventoryService';
import useCartStore from '../../store/cartStore';
import { cartItemToPricingLine } from '../../utils/cartVolumePricing';
import { buildStreetWithNumbers } from '../../utils/addressDisplay';
import { isOroDiamanteSeller } from '../../utils/sellerVolumeDiscount';
import {
  itemSkipsStockValidation,
  cartLineToApiEncargoFlags,
} from '../../utils/encargoUtils';

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
  freeShipping,
  freeShippingMinAmount = 0,
  shippingAmount = 0, // Monto del envío calculado
  // Nuevas props para el formulario integrado
  cartItems = [],
  selectedPaymentCard = null,
  onPaymentCardChange,
  onIntegratedPaymentSuccess,
  onIntegratedPaymentError,
  deliveryType = 'envio', // 'envio' or 'retiro'
  user = null, // Usuario para verificar categoría oro
  paymentMethod = 'mercadopago', // Método de pago seleccionado
  onPaymentMethodChange = null, // Callback para cambiar método de pago
  hasAdvanceOrders = false, // Si hay productos adelantados
  hasRegularItems = true // Si hay productos regulares (con stock)
}) => {
  const navigate = useNavigate();
  // Pedido directo (sin MP): categoría Oro/Diamante o vendedor (que compra para sus clientes oro/diamante)
  const usesDirectOrderPayment = isOroDiamanteSeller(user) || user?.role?.name === 'vendedor';
  
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

  // Obtener funciones del store de carrito
  const { updateQuantity, removeItem } = useCartStore();

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
        const cards = response.data.cards;
        setPaymentCards(cards);
        setCardsVersion(prev => prev + 1); // Forzar re-render

        // Si no hay tarjeta seleccionada, seleccionar la predeterminada automáticamente
        if (!selectedPaymentCard && cards.length > 0 && onPaymentCardChange) {
          const defaultCard = cards.find(card => card.is_default);
          if (defaultCard) {
            onPaymentCardChange(defaultCard);
          } else {
            // Si no hay predeterminada, seleccionar la primera
            onPaymentCardChange(cards[0]);
          }
        }
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

    // Si es envío, validar que haya dirección seleccionada
    if (deliveryType === 'envio' && !selectedAddress) {
      if (window.showToast) {
        window.showToast('Selecciona una dirección de entrega', 'warning');
      }
      return;
    }

    const canContinue = await validateCartBeforeOrder();
    if (!canContinue) {
      // Detener compra
      return; // ← Esto detiene la compra
    }

    if (!window.mp) {
      if (window.showToast) {
        window.showToast('Error: MercadoPago no está cargado', 'error');
      }
      return;
    }

    setIsProcessingPayment(true);

    // ⚠️ SIN TRY-CATCH - Para ver el error exacto en la consola

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

    // Formatear transaction_amount con 2 decimales
    // IMPORTANTE: Usar el total que viene del prop 'total' que ya incluye descuentos aplicados
    // Este total viene de CartDetailsPage y ya tiene el descuento del 20% y 10% adicional aplicado
    const totalConDescuento = Number(total); // Este total ya viene con descuentos aplicados desde CartDetailsPage
    const formattedTransactionAmount = parseFloat(totalConDescuento.toFixed(2));

      // Calcular subtotal (monto sin descuentos) y discounted_total (monto con descuentos pero sin envío)
      const subtotalSinDescuento = Number(subtotal) || 0; // Subtotal sin descuentos aplicados
      const totalConDescuentoSinEnvio = totalConDescuento - parseFloat(shippingAmount || 0); // Total con descuentos pero sin envío

      const linesForVolume = cartItems.map(cartItemToPricingLine);
      const itemsForVolumePricing = linesForVolume.map((line) => ({
        price: line.price,
        quantity: line.quantity,
        desc_promo: line.desc_promo,
        user_offer_applies: line.user_offer_applies,
      }));

      const paymentData = {
        token: cardToken.id,
        payment_method_id: finalPaymentMethodId,
      transaction_amount: formattedTransactionAmount,
        installments: 1, // Siempre 1 cuota
        items: cartItems.map(item => {
          const mappedItem = {
            product_id: String(item.id_articulo || item.product_id || item.id),
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null,
            detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
            ...cartLineToApiEncargoFlags(item),
            desc_promo: item.desc_promo ?? null,
            user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
            image: item.image && item.image !== '/images/placeholder.jpg' && item.image !== '/images/catalogProductImages/Rectangle 4922.png'
              ? item.image
              : null,
          };

          return mappedItem;
        }),
        items_for_volume_pricing: itemsForVolumePricing,
      address_id: deliveryType === 'envio' && selectedAddress ? parseInt(selectedAddress.id, 10) : null,
      delivery_type: deliveryType, // 'envio' or 'retiro'
      shipping_amount: parseFloat(shippingAmount || 0), // Monto del envío
        subtotal: subtotalSinDescuento, // Monto total sin descuentos aplicados
        discounted_total: totalConDescuentoSinEnvio, // Monto total con descuentos aplicados (sin envío)
        // Información para crear/actualizar registro dayFortyFive
        day_forty_five_applied: dayFortyFiveApplied,
        day_forty_five_discount_percentage: dayFortyFiveDiscountPercentage,
        eligible_total: eligibleTotal,
        // Descuentos del 20% y 10% adicional
        descuento1: Number(discount1) || 0, // 30 u 33 si aplica volumen $7k; 0 si no
        descuento2: Number(discount2) || 0  // 10 si aplica $15k; 0 si no
      };

      try {
        const response = await api.post('/payment/process-integrated', paymentData);

        if (response.data.success) {
          const { data } = response.data;
          const paymentStatus = data.payment_status;
          
          // Manejar diferentes estados del pago
          if (paymentStatus === 'approved') {
            if (window.showToast) {
              window.showToast('¡Gracias por tu compra!', 'success');
            }
            
            if (onIntegratedPaymentSuccess) {
              onIntegratedPaymentSuccess(response.data);
            }
          } else if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
            // Pago pendiente - redirigir a página de verificación
            if (window.showToast) {
              window.showToast(data.message || 'Tu pago está pendiente de confirmación', 'info');
            }
            
            // Redirigir a página de pago pendiente con información de la orden
            setTimeout(() => {
              window.location.href = `/pago-pendiente?orderId=${data.order_id}&paymentId=${data.payment_id}`;
            }, 2000);
          } else {
            // Otro estado (rejected, etc.)
            if (window.showToast) {
              window.showToast(data.message || 'El pago no fue aprobado', 'error');
            }
            
            if (onIntegratedPaymentError) {
              onIntegratedPaymentError(response.data);
            }
          }
        } else {
          // Verificar si hay una orden pendiente
          if (response.data.has_pending_order && response.data.pending_order) {
            const pendingOrder = response.data.pending_order;
            const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
            
            Swal.fire({
              title: 'Orden Pendiente',
              html: `
                <p>${response.data.message}</p>
                <p style="margin-top: 15px; font-size: 14px;">
                  <strong>Orden:</strong> ${orderNumber}<br>
                  <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
                </p>
              `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Ver Mis Órdenes',
              cancelButtonText: 'Cancelar',
              confirmButtonColor: '#EA2630',
              cancelButtonColor: '#6c757d',
              reverseButtons: true
            }).then((result) => {
              if (result.isConfirmed) {
                // Redirigir a la página de mis pedidos
                window.location.href = '/perfil/mis-pedidos';
              }
            });
          } else {
            if (window.showToast) {
              window.showToast(response.data.message || 'Error al procesar el pago', 'error');
            }

            if (onIntegratedPaymentError) {
              onIntegratedPaymentError(response.data);
            }
          }
        }
      } catch (error) {
        // Verificar si el error es por orden pendiente
        if (error.response?.data?.has_pending_order && error.response?.data?.pending_order) {
          const pendingOrder = error.response.data.pending_order;
          const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
          
          Swal.fire({
            title: 'Orden Pendiente',
            html: `
              <p>${error.response.data.message}</p>
              <p style="margin-top: 15px; font-size: 14px;">
                <strong>Orden:</strong> ${orderNumber}<br>
                <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
              </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver Mis Órdenes',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EA2630',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
            }).then((result) => {
            if (result.isConfirmed) {
              // Redirigir a la página de mis pedidos
              window.location.href = '/perfil/mis-pedidos';
            }
          });
        } else {
          const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';
          if (window.showToast) {
            window.showToast(errorMessage, 'error');
          }

          if (onIntegratedPaymentError) {
            onIntegratedPaymentError(error.response?.data || { message: errorMessage });
          }
        }
      } finally {
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


  // ===== USAR EL TOTAL FINAL QUE YA VIENE CON DESCUENTOS Y ENVÍO =====
  // El total que se pasa desde CartDetailsPage ya incluye:
  // - Descuentos de productos individuales (desc_promo)
  // - Descuentos del 20% o 20% + 10% adicional (aplicados sobre productos elegibles)
  // - Envío (si no hay envío gratis)
  // Por lo tanto, usamos directamente este total sin recalcular
  // IMPORTANTE: Este total ya tiene el descuento aplicado desde CartDetailsPage
  const finalTotal = Number(total);
  
  // Calcular información de descuentos solo para logging
  const eligibleItems = cartItems.filter(item => {
    const hasNoPromo = item.desc_promo === 0 || item.desc_promo === null || item.desc_promo === undefined;
    const hasNoUserOffer = !item.userOffer || item.userOffer.discount_category === null;
    return hasNoPromo && hasNoUserOffer;
  });

  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const itemPrice = item.precio || item.price || 0;
    const itemQuantity = item.quantity || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);

  let dayFortyFiveApplied = false;
  let dayFortyFiveDiscountPercentage = 0;
    if (eligibleTotal >= 15000) {
      dayFortyFiveDiscountPercentage = 40;
      dayFortyFiveApplied = true;
    } else if (eligibleTotal >= 7000) {
      dayFortyFiveDiscountPercentage = 30;
      dayFortyFiveApplied = true;
    }
    
  // Calcular envío solo para logging (comparar total con subtotal)
  const baseTotal = Number(subtotal);
  const envio = finalTotal > baseTotal ? (finalTotal - baseTotal) : 0;

  // Función para procesar pago con Mercado Pago (redirección)
  // Esta función NO requiere HTTPS porque usa Checkout Pro (redirección completa)
  const processMercadoPagoPayment = async () => {
    // Si es envío, validar que haya dirección seleccionada
    if (deliveryType === 'envio' && !selectedAddress) {
      if (window.showToast) {
        window.showToast('Selecciona una dirección de entrega', 'warning');
      }
      return;
    }

    const canContinue = await validateCartBeforeOrder();
    if (!canContinue) {
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Asegurar que finalTotal incluya descuentos y envío
      // finalTotal viene del prop 'total' que ya incluye:
      // - Descuentos de productos individuales (desc_promo)
      // - Descuentos del 30% o 30% + 10% adicional (aplicados sobre productos elegibles)
      // - Envío (agregado si no hay envío gratis)
      
      // IMPORTANTE: Usar el total FINAL que viene del prop 'total'
      // Este total ya incluye:
      // - Descuentos de productos individuales (desc_promo)
      // - Descuentos del 20% o 20% + 10% adicional (aplicados sobre productos elegibles)
      // - Envío (si no hay envío gratis)
      // NO usar subtotal ni recalcular
      const totalFinal = Number(total); // Este total ya viene con descuentos aplicados desde CartDetailsPage
      const formattedTotalAmount = parseFloat(totalFinal.toFixed(2));
      
      // Asegurar que usamos el total FINAL con descuentos aplicados
      const totalAmountToSend = formattedTotalAmount;
      
      // Calcular subtotal (monto sin descuentos) y discounted_total (monto con descuentos pero sin envío)
      const subtotalSinDescuento = Number(subtotal) || 0; // Subtotal sin descuentos aplicados
      const totalConDescuentoSinEnvio = totalAmountToSend - parseFloat(shippingAmount || 0); // Total con descuentos pero sin envío

      const linesForVolume = cartItems.map(cartItemToPricingLine);
      const itemsForVolumePricing = linesForVolume.map((line) => ({
        price: line.price,
        quantity: line.quantity,
        desc_promo: line.desc_promo,
        user_offer_applies: line.user_offer_applies,
      }));

      const paymentData = {
        items: cartItems.map(item => ({
          product_id: String(item.id_articulo || item.product_id || item.id), // Enviar como string para soportar IDs con ceros a la izquierda
          name: item.title || item.name,
          quantity: parseInt(item.quantity, 10),
          price: parseFloat(item.precio || item.price), // Precio ya incluye descuentos individuales (desc_promo)
          size: item.selectedSize || null,
          color: item.selectedColor || null,
          barcode: item.barcode || null,
          detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
          ...cartLineToApiEncargoFlags(item),
          desc_promo: item.desc_promo ?? null,
          user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
          image: item.image && item.image !== '/images/placeholder.jpg' && item.image !== '/images/catalogProductImages/Rectangle 4922.png'
            ? item.image
            : null,
        })),
        items_for_volume_pricing: itemsForVolumePricing,
        address_id: deliveryType === 'envio' && selectedAddress ? parseInt(selectedAddress.id, 10) : null,
        delivery_type: deliveryType, // 'envio' or 'retiro'
        shipping_amount: parseFloat(shippingAmount || 0), // Monto del envío
        total_amount: totalAmountToSend, // Total FINAL con descuentos y envío incluidos
        subtotal: subtotalSinDescuento, // Monto total sin descuentos aplicados
        discounted_total: totalConDescuentoSinEnvio, // Monto total con descuentos aplicados (sin envío)
        // Descuentos del 20% y 10% adicional
        descuento1: Number(discount1) || 0, // 30 u 33 si aplica volumen $7k; 0 si no
        descuento2: Number(discount2) || 0  // 10 si aplica $15k; 0 si no
      };

      const response = await api.post('/payment/create-preference', paymentData);

      if (response.data.success) {
        const { data } = response.data;

        if (window.showToast) {
          window.showToast('¡Redirigiendo a Mercado Pago!', 'success');
        }

        // Guardar información del pedido en localStorage
        localStorage.setItem('pending_order', JSON.stringify({
          orderId: data.order_id,
          externalReference: data.external_reference,
          totalAmount: finalTotal
        }));

        const mpUrl =
          data.redirect_url
          || data.init_point
          || data.sandbox_init_point
          || data.payment_url
          || data.sandbox_payment_url;
        setTimeout(() => {
          if (mpUrl) {
            window.location.replace(mpUrl);
          }
        }, data.order_split || data.requires_mercadopago_redirect ? 0 : 1500);
      } else {
        // Verificar si hay una orden pendiente
        if (response.data.has_pending_order && response.data.pending_order) {
          const pendingOrder = response.data.pending_order;
          const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
          
          Swal.fire({
            title: 'Orden Pendiente',
            html: `
              <p>${response.data.message}</p>
              <p style="margin-top: 15px; font-size: 14px;">
                <strong>Orden:</strong> ${orderNumber}<br>
                <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
              </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver Mis Órdenes',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EA2630',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              // Redirigir a la página de mis pedidos
              window.location.href = '/perfil/mis-pedidos';
            }
          });
        } else {
          throw new Error(response.data.message || 'Error al crear la preferencia de pago');
        }
      }
    } catch (error) {
      // Verificar si el error es por orden pendiente
      if (error.response?.data?.has_pending_order && error.response?.data?.pending_order) {
        const pendingOrder = error.response.data.pending_order;
        const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
        
        Swal.fire({
          title: 'Orden Pendiente',
          html: `
            <p>${error.response.data.message}</p>
            <p style="margin-top: 15px; font-size: 14px;">
              <strong>Orden:</strong> ${orderNumber}<br>
              <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
            </p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Ver Mis Órdenes',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#EA2630',
          cancelButtonColor: '#6c757d',
          reverseButtons: true
        }).then((result) => {
          if (result.isConfirmed) {
            // Redirigir a la página de mis pedidos
            window.location.href = '/perfil/mis-pedidos';
          }
        });
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleProcessPayment = async () => {
    if (usesDirectOrderPayment && hasRegularItems && onGenerateOrder) {
      setIsProcessingPayment(true);
      try {
        await onGenerateOrder({ paymentMethod });
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }
    processMercadoPagoPayment();
  };

  const validateCartBeforeOrder = async () => {
    let hasErrors = false;

    window.showToast(
      `Validando disponibilidad de las prendas.`,
      "info"
    );

    // Limpiar caché de stock para validar SIEMPRE contra la BD (no usar stock viejo)
    clearInventoryCache();

    // Recorremos todo el carrito
    for (const item of cartItems) {

      const productId = item.id_articulo;
      const size = item.selectedSize;
      const color = item.selectedColor;
      const requestedQuantity = item.quantity;
      const descPromo = Number(item.desc_promo || item.descPromo || 0);
      
      if (itemSkipsStockValidation(item, user)) {
        continue;
      }

      try {
        const stockValidation = await validateStock(
          productId,
          size,
          color,
          requestedQuantity
        );

        if (!stockValidation.isValid) {
          hasErrors = true;

          // Rebaja agotada: NUNCA se permite (ni como encargo ni ajustando).
          // Bloqueamos la compra para que el usuario retire el producto.
          if (descPromo > 0.00001 && stockValidation.availableStock <= 0) {
            if (window.showToast) {
              window.showToast(
                `El producto ${productId} (${color} / ${size}) está en rebaja y agotado. Retíralo del carrito para continuar.`,
                "error"
              );
            }
            continue;
          }

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
              {selectedAddress.id === 'store' ? (
                <>
                  <div className="cart-order-summary__address-name">
                    <strong>Retiro en Tienda</strong>
                    <span className="cart-order-summary__default-badge" style={{ backgroundColor: '#10b981' }}>Tienda</span>
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
                </>
              ) : (
                <>
                  <div className="cart-order-summary__address-street">
                    {buildStreetWithNumbers(selectedAddress) || selectedAddress.street_address}
                  </div>
                  <div className="cart-order-summary__address-location">
                    {selectedAddress.city}
                    {selectedAddress.state && `, ${selectedAddress.state}`}
                    {selectedAddress.postal_code && ` CP: ${selectedAddress.postal_code}`}
                    {selectedAddress.country && `, ${selectedAddress.country}`}
                  </div>
                  {selectedAddress.is_default && (
                    <span className="cart-order-summary__default-badge">Predeterminada</span>
                  )}
                </>
              )}
              {selectedAddress.additional_info && (
                <div className="cart-order-summary__address-additional">
                  <small>{selectedAddress.additional_info}</small>
                </div>
              )}
              {/* Botón Ver en Google Maps - Solo móvil y solo para retiro en tienda */}
              {selectedAddress.id === 'store' && (
                <div className="cart-order-summary__google-maps-button cart-order-summary__google-maps-button--mobile">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${buildStreetWithNumbers(selectedAddress) || selectedAddress.street_address || ''} ${selectedAddress.city || ''} ${selectedAddress.country || ''}`.trim()
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cart-order-summary__google-maps-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
                    </svg>
                    Ver en Google Maps
                  </a>
            </div>
              )}
          </div>
          </div>
      <div className="cart-order-summary__divider" />
        </>
      )}
      {/* Bronce (con o sin descuento API) → Mercado Pago. Oro/Diamante → Confirmar pedido (pedido directo). */}
      {hasRegularItems && !usesDirectOrderPayment && (
        <div className="cart-order-summary__section payment-method-section">
          <div className="cart-order-summary__section-title section-title-flex">
            <img
              src="/images/mercadopago-logo.png"
              alt="Mercado Pago"
              style={{ width: '40px', height: '40px', marginRight: '8px', display: 'block', objectFit: 'contain' }}
              onError={(e) => {
                e.target.src = getIconPath('Handshake.svg');
              }}
            />
            <span>Método de Pago</span>
          </div>
          <div style={{ marginTop: '10px', marginLeft: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
              Pagar con Mercado Pago
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
              Al continuar se abrirá el checkout de Mercado Pago.
            </div>
          </div>
        </div>
      )}
      {/* Mensaje informativo si hay productos adelantados */}
      {hasAdvanceOrders && (
        <div className="cart-order-summary__section" style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
          <div style={{ fontSize: '14px', color: '#856404', fontWeight: '600', marginBottom: '8px' }}>
            📦 Productos Adelantados
          </div>
          <div style={{ fontSize: '12px', color: '#856404' }}>
            {usesDirectOrderPayment
              ? 'Los artículos en encargo (Próximamente o Agotado) se incluyen en el mismo pedido; al confirmar queda pendiente de pago hasta liquidación.'
              : 'Los productos en encargo (Próximamente o Agotado) se crearán como pedido adelantado y quedarán pendientes de pago hasta que el administrador registre el pago.'}
          </div>
        </div>
      )}

      {/* Modal para agregar nueva tarjeta - ELIMINADO */}
      {false && (
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

      <div className="cart-order-summary__actions">
        {hasAdvanceOrders && !hasRegularItems ? (
          <CustomButton
            variant="filled"
            size="small"
            onClick={onGenerateOrder}
            disabled={isProcessingPayment}
            iconLeft={<img className="cart-order-summary__generate-icon" src={getIconPath('Handshake.svg')} alt="Handshake" />}
            className="cart-order-summary__summary-btn"
            style={{ backgroundColor: '#d32f2f', color: 'white' }}
          >
            {isProcessingPayment
              ? (usesDirectOrderPayment ? 'Confirmando pedido...' : 'Generando pedido...')
              : usesDirectOrderPayment
                ? 'Confirmar Pedido'
                : 'Generar Pedido Adelantado'}
          </CustomButton>
        ) : (
          <CustomButton
            variant="outlined"
            size="small"
            onClick={handleProcessPayment}
            disabled={isProcessingPayment}
            iconLeft={<img className="cart-order-summary__generate-icon" src={getIconPath('Handshake.svg')} alt="Handshake" />}
            className="cart-order-summary__summary-btn"
          >
            {isProcessingPayment
              ? (usesDirectOrderPayment && hasRegularItems ? 'Confirmando pedido...' : 'Procesando pago...')
              : usesDirectOrderPayment && hasRegularItems
                ? 'Confirmar Pedido'
                : 'Pagar con Mercado Pago'}
          </CustomButton>
        )}
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
