import CustomButton from '../components/CustomButton';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './CheckoutSuccessPage.css';
import { getIconPath } from '../utils/assetPaths';
import api from '../services/api';
import useCartStore from '../store/cartStore';

export default function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  
  // Obtener datos del pago desde el state de navegación (pago con tarjeta)
  const stateOrderData = location.state?.orderData;
  const statePaymentStatus = location.state?.paymentStatus;

  useEffect(() => {
    const verifyPayment = async () => {
      // Si viene de pago con tarjeta (tiene state)
      if (stateOrderData) {
        setOrderData(stateOrderData);
        setPaymentStatus(statePaymentStatus || 'approved');
        setMessage('¡Pago realizado con éxito!');
        setLoading(false);
        return;
      }

      // Si viene de MercadoPago (tiene parámetros en URL)
      const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
      const status = searchParams.get('status') || searchParams.get('collection_status');
      const externalReference = searchParams.get('external_reference');
      const preferenceId = searchParams.get('preference_id');

      // Limpiar valores "null" string a null real
      const cleanPaymentId = (paymentId && paymentId !== 'null' && paymentId !== '') ? paymentId : null;
      const cleanStatus = (status && status !== 'null' && status !== '') ? status : null;
      const cleanExternalRef = (externalReference && externalReference !== 'null' && externalReference !== '') ? externalReference : null;
      const cleanPreferenceId = (preferenceId && preferenceId !== 'null' && preferenceId !== '') ? preferenceId : null;

      // Si no hay parámetros de pago válidos, redirigir al carrito
      if (!cleanPaymentId && !cleanExternalRef && !cleanPreferenceId) {
        // Si viene de Mercado Pago pero sin parámetros válidos, probablemente canceló o hubo error
        // Redirigir al carrito
        navigate('/carrito-detalle', { replace: true });
        return;
      }

      try {
        // Llamar al backend para verificar y procesar el pago
        const response = await api.get('/payment/verify', {
          params: {
            payment_id: cleanPaymentId,
            status: cleanStatus,
            external_reference: cleanExternalRef,
            preference_id: cleanPreferenceId
          }
        });

        if (response.data.success) {
          setPaymentStatus(response.data.payment_status);
          setOrderData(response.data.order);
          setMessage(response.data.message);
        } else {
          setError(response.data.message || 'Error al verificar el pago');
          setPaymentStatus('error');
        }
      } catch (err) {
        console.error('Error verificando pago:', err);
        
        // Si hay external_reference o preference_id válidos pero el error es de conexión,
        // probablemente es porque estamos en localhost y Mercado Pago no puede acceder
        if ((cleanExternalRef || cleanPreferenceId) && 
            (err.code === 'ERR_CONNECTION_CLOSED' || 
             err.message?.includes('ERR_CONNECTION') ||
             err.message?.includes('Network Error'))) {
          setError('No se pudo verificar el pago porque estás usando localhost. Para desarrollo local, configura ngrok o usa una URL pública.');
        } else {
          setError(err.response?.data?.message || 'Error al verificar el pago');
        }
        setPaymentStatus('error');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [stateOrderData, statePaymentStatus, searchParams, navigate]);

  // Limpiar carrito después de pago exitoso
  useEffect(() => {
    if (paymentStatus === 'approved') {
      // Limpiar carrito usando el store (maneja BD y localStorage)
      const { clearCart } = useCartStore.getState();
      clearCart();
      // Disparar evento para actualizar el header
      window.dispatchEvent(new Event('cartUpdated'));
    }
  }, [paymentStatus]);

  // Mostrar loading mientras verifica
  if (loading) {
    return (
      <div className="container checkout-success-page">
        <div className="checkout-success-card checkout-loading">
          <div className="checkout-spinner"></div>
          <p>Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  // Mostrar error
  if (error || paymentStatus === 'error') {
    return (
      <div className="container checkout-success-page">
        <div className="checkout-success-card checkout-error">
          <div className="checkout-error-icon">❌</div>
          <h1 className="checkout-success-title">Error en el pago</h1>
          <p className="checkout-success-desc">{error || 'Ocurrió un error al procesar tu pago.'}</p>
          <div className="checkout-success-actions">
            <CustomButton 
              variant="filled" 
              onClick={() => navigate('/carrito-detalle')} 
              className="btn-checkout"
            >
              Volver al carrito
            </CustomButton>
            <CustomButton 
              variant="outlined" 
              onClick={() => navigate('/')}
              className="btn-checkout"
            >
              Ir al inicio
            </CustomButton>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar pago rechazado
  if (paymentStatus === 'rejected') {
    return (
      <div className="container checkout-success-page">
        <div className="checkout-success-card checkout-rejected">
          <div className="checkout-rejected-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="#dc3545" strokeWidth="4"/>
              <path d="M20 20L40 40M40 20L20 40" stroke="#dc3545" strokeWidth="4" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="checkout-success-title">Pago rechazado</h1>
          <p className="checkout-success-desc">
            {message || 'Tu pago no pudo ser procesado. Por favor intenta con otro método de pago.'}
          </p>
          <div className="checkout-success-actions">
            <CustomButton 
              variant="filled" 
              onClick={() => navigate('/carrito-detalle')} 
              className="btn-checkout"
            >
              Intentar de nuevo
            </CustomButton>
            <CustomButton 
              variant="outlined" 
              onClick={() => navigate('/')}
              className="btn-checkout"
            >
              Ir al inicio
            </CustomButton>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar pago pendiente (OXXO u otro)
  if (paymentStatus === 'pending' || paymentStatus === 'in_process') {
    return (
      <div className="container checkout-success-page">
        <div className="checkout-success-card checkout-pending">
          <div className="checkout-pending-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="28" stroke="#ffc107" strokeWidth="4"/>
              <path d="M30 15V32" stroke="#ffc107" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="30" cy="42" r="3" fill="#ffc107"/>
            </svg>
          </div>
          <h1 className="checkout-success-title">Pago pendiente</h1>
          <p className="checkout-success-desc">
            {message || 'Tu pago está pendiente de confirmación. Te notificaremos cuando se complete.'}
          </p>
          {orderData && (
            <div className="checkout-order-info">
              <p><strong>Pedido:</strong> #{orderData.id}</p>
              <p><strong>Total:</strong> ${Number(orderData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          )}
          <div className="checkout-success-actions">
            <CustomButton 
              variant="filled" 
              onClick={() => navigate('/perfil/mis-pedidos')} 
              className="btn-checkout"
            >
              Ver mis pedidos
            </CustomButton>
            <CustomButton 
              variant="outlined" 
              onClick={() => navigate('/')}
              className="btn-checkout"
            >
              Ir al inicio
            </CustomButton>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar pago exitoso (approved)
  return (
    <div className="container checkout-success-page">
      <div className="checkout-success-card">
        <div className="checkout-success-status">
          <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.5 0.250122C4.21875 0.250122 0.75 3.75012 0.75 8.00012C0.75 12.2814 4.21875 15.7501 8.5 15.7501C12.75 15.7501 16.25 12.2814 16.25 8.00012C16.25 3.75012 12.75 0.250122 8.5 0.250122ZM8.5 1.75012C11.9375 1.75012 14.75 4.56262 14.75 8.00012C14.75 11.4689 11.9375 14.2501 8.5 14.2501C5.03125 14.2501 2.25 11.4689 2.25 8.00012C2.25 4.56262 5.03125 1.75012 8.5 1.75012ZM12.875 5.84387L12.1562 5.12512C12.0312 4.96887 11.7812 4.96887 11.625 5.12512L7.21875 9.50012L5.34375 7.62512C5.1875 7.46887 4.96875 7.46887 4.8125 7.62512L4.09375 8.31262C3.96875 8.46887 3.96875 8.71887 4.09375 8.84387L6.9375 11.7189C7.09375 11.8751 7.3125 11.8751 7.46875 11.7189L12.875 6.37512C13 6.21887 13 5.96887 12.875 5.84387Z" fill="#1DA534" />
          </svg>
          <span className="checkout-success-status-text">Pago realizado con éxito</span>
        </div>
        <h1 className="checkout-success-title">¡Gracias por tu compra!</h1>
        <p className="checkout-success-desc">
          {message || 'Tu pedido se está procesando. Recibirás un correo con los detalles de tu compra.'}
        </p>
        {orderData && (
          <div className="checkout-order-info">
            <p><strong>Pedido:</strong> #{orderData.id}</p>
            <p><strong>Total:</strong> ${Number(orderData.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p><strong>Fecha:</strong> {orderData.created_at}</p>
          </div>
        )}
        <div className="checkout-success-social-box">
          <div className="checkout-success-social-title">Síguenos también en nuestras redes sociales</div>
          <div className="checkout-success-social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="checkout-social-icon">
              <svg width="30" height="30" viewBox="0 0 15 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.8268 15.6668L14.556 10.8751H9.92057V7.75014C9.92057 6.39598 10.5456 5.14598 12.6289 5.14598H14.7643V1.03139C14.7643 1.03139 12.8372 0.666809 11.0143 0.666809C7.21224 0.666809 4.71224 3.01056 4.71224 7.17723V10.8751H0.441406V15.6668H4.71224V27.3335H9.92057V15.6668H13.8268Z" fill="#EA2630" />
              </svg>
            </a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="checkout-social-icon">
              <svg width="30" height="29" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5052 6.01048C9.17188 6.01048 6.51563 8.71881 6.51563 12.0001C6.51563 15.3334 9.17188 17.9896 12.5052 17.9896C15.7865 17.9896 18.4948 15.3334 18.4948 12.0001C18.4948 8.71881 15.7865 6.01048 12.5052 6.01048ZM12.5052 15.9063C10.3698 15.9063 8.59896 14.1876 8.59896 12.0001C8.59896 9.86464 10.3177 8.14589 12.5052 8.14589C14.6406 8.14589 16.3594 9.86464 16.3594 12.0001C16.3594 14.1876 14.6406 15.9063 12.5052 15.9063ZM20.1094 5.80214C20.1094 5.02089 19.4844 4.39589 18.7031 4.39589C17.9219 4.39589 17.2969 5.02089 17.2969 5.80214C17.2969 6.58339 17.9219 7.20839 18.7031 7.20839C19.4844 7.20839 20.1094 6.58339 20.1094 5.80214ZM24.0677 7.20839C23.9635 5.33339 23.5469 3.66673 22.1927 2.31256C20.8385 0.958394 19.1719 0.541728 17.2969 0.437561C15.3698 0.333394 9.58854 0.333394 7.66146 0.437561C5.78646 0.541728 4.17188 0.958394 2.76563 2.31256C1.41146 3.66673 0.994792 5.33339 0.890625 7.20839C0.786458 9.13548 0.786458 14.9167 0.890625 16.8438C0.994792 18.7188 1.41146 20.3334 2.76563 21.7396C4.17188 23.0938 5.78646 23.5105 7.66146 23.6146C9.58854 23.7188 15.3698 23.7188 17.2969 23.6146C19.1719 23.5105 20.8385 23.0938 22.1927 21.7396C23.5469 20.3334 23.9635 18.7188 24.0677 16.8438C24.1719 14.9167 24.1719 9.13548 24.0677 7.20839ZM21.5677 18.8751C21.2031 19.9167 20.3698 20.698 19.3802 21.1146C17.8177 21.7396 14.1719 21.5834 12.5052 21.5834C10.7865 21.5834 7.14063 21.7396 5.63021 21.1146C4.58854 20.698 3.80729 19.9167 3.39063 18.8751C2.76563 17.3646 2.92188 13.7188 2.92188 12.0001C2.92188 10.3334 2.76563 6.68756 3.39063 5.12506C3.80729 4.13548 4.58854 3.35423 5.63021 2.93756C7.14063 2.31256 10.7865 2.46881 12.5052 2.46881C14.1719 2.46881 17.8177 2.31256 19.3802 2.93756C20.3698 3.30214 21.151 4.13548 21.5677 5.12506C22.1927 6.68756 22.0365 10.3334 22.0365 12.0001C22.0365 13.7188 22.1927 17.3646 21.5677 18.8751Z" fill="#EA2630" />
              </svg>
            </a>
            <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="checkout-social-icon">
              <svg width="33" height="25" viewBox="0 0 29 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27.9701 3.17714C27.6576 1.92714 26.668 0.937561 25.4701 0.625061C23.2305 6.10352e-05 14.3763 6.10352e-05 14.3763 6.10352e-05C14.3763 6.10352e-05 5.47005 6.10352e-05 3.23047 0.625061C2.03255 0.937561 1.04297 1.92714 0.730469 3.17714C0.105469 5.36464 0.105469 10.0521 0.105469 10.0521C0.105469 10.0521 0.105469 14.6876 0.730469 16.9271C1.04297 18.1771 2.03255 19.1146 3.23047 19.4271C5.47005 20.0001 14.3763 20.0001 14.3763 20.0001C14.3763 20.0001 23.2305 20.0001 25.4701 19.4271C26.668 19.1146 27.6576 18.1771 27.9701 16.9271C28.5951 14.6876 28.5951 10.0521 28.5951 10.0521C28.5951 10.0521 28.5951 5.36464 27.9701 3.17714ZM11.4596 14.2709V5.83339L18.8555 10.0521L11.4596 14.2709Z" fill="#EA2630" />
              </svg>
            </a>
          </div>
        </div>
        <div className="checkout-success-invite">Te invitamos a seguir disfrutando de todos nuestros productos</div>
        <div className="content-checkout-success-logo">
          <img src={`${window.location.origin}/images/logo.svg`} alt="Cherry Logo" className="checkout-success-logo" />
        </div>
        <div className="checkout-success-actions">
          <CustomButton 
            variant="filled" 
            onClick={() => navigate('/perfil/mis-pedidos')} 
            iconLeft={<img className="checkout-store-icon" src={getIconPath('Shopping Cart.svg')} alt="Pedidos" />} 
            className="btn-checkout"
          >
            Ver mis pedidos
          </CustomButton>
          <CustomButton 
            variant="filled" 
            onClick={() => navigate('/catalogo')} 
            iconLeft={<img className="checkout-store-icon" src={getIconPath('Store.svg')} alt="Store" />} 
            className="btn-checkout"
          >
            Ir a tienda
          </CustomButton>
          <CustomButton 
            variant="outlined" 
            onClick={() => navigate('/')}
            iconRight={<img src={getIconPath('Chevron Right.svg')} alt="home" />}
            className="btn-checkout"
          >
            Volver al inicio
          </CustomButton>
        </div>
      </div>
    </div>
  );
} 
