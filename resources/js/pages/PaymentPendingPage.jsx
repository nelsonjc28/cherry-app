import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../config/axios';
import './PaymentPendingPage.css';

const PaymentPendingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');
  
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Verificar estado del pago
  const checkPaymentStatus = async () => {
    // Modo de prueba: no hacer llamadas reales
    const isTestMode = !orderId || orderId === 'test' || orderId === 'demo';
    if (isTestMode || isChecking) return;
    
    setIsChecking(true);
    try {
      const response = await api.get(`/api/payment/status/${orderId}`);
      
      if (response.data.success) {
        setPaymentStatus(response.data.payment_status);
        setOrderStatus(response.data.order_status);
        
        // Si el pago fue aprobado, redirigir a página de éxito
        if (response.data.payment_status === 'approved') {
          // Detener polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          if (window.showToast) {
            window.showToast('¡Tu pago ha sido aprobado!', 'success');
          }
          
          setTimeout(() => {
            navigate('/compra-exitosa', {
              state: {
                orderId: orderId,
                paymentId: paymentId
              }
            });
          }, 2000);
        } else if (response.data.payment_status === 'rejected') {
          // Si fue rechazado, detener polling y mostrar mensaje
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
          
          if (window.showToast) {
            window.showToast('Tu pago fue rechazado. Por favor, intenta con otro método de pago.', 'error');
          }
        }
      }
    } catch (error) {
    } finally {
      setIsChecking(false);
    }
  };

  // Iniciar polling cuando se monta el componente
  useEffect(() => {
    // Modo de prueba: si no hay orderId, mostrar estado de prueba
    const isTestMode = !orderId || orderId === 'test' || orderId === 'demo';
    
    if (isTestMode) {
      // Simular estado pendiente para prueba visual
      setPaymentStatus('pending');
      setOrderStatus('pendiente_pago');
      return;
    }

    // Verificar inmediatamente
    checkPaymentStatus();

    // Configurar polling cada 10 segundos
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 10000);

    setPollingInterval(interval);

    // Limpiar intervalo al desmontar
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [orderId]);

  // Detener polling después de 5 minutos (300 segundos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }, 300000); // 5 minutos

    return () => clearTimeout(timeout);
  }, [pollingInterval]);

  const getStatusMessage = () => {
    if (!paymentStatus) {
      return 'Verificando estado del pago...';
    }

    switch (paymentStatus) {
      case 'pending':
        return 'Tu pago está pendiente de confirmación. Por favor, espera mientras procesamos tu pago.';
      case 'in_process':
        return 'Tu pago está siendo procesado. Esto puede tomar unos minutos.';
      case 'approved':
        return '¡Tu pago ha sido aprobado! Redirigiendo...';
      case 'rejected':
        return 'Tu pago fue rechazado. Por favor, intenta con otro método de pago.';
      default:
        return 'Verificando estado del pago...';
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'pending':
      case 'in_process':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      default:
        return '🔄';
    }
  };

  return (
    <>
      <Helmet>
        <title>Pago Pendiente - Cherry Central</title>
        <meta name="description" content="Verificando estado de tu pago" />
      </Helmet>

      <div className="payment-pending-page">
        <div className="payment-pending-container">
          <div className="payment-pending-content">
            <div className="payment-pending-icon">
              {getStatusIcon()}
            </div>
            
            <h1 className="payment-pending-title">Pago Pendiente</h1>
            
            <p className="payment-pending-message">
              {getStatusMessage()}
            </p>

            {(orderId || process.env.NODE_ENV === 'development') && (
              <div className="payment-pending-info">
                {orderId ? (
                  <>
                    <p><strong>Número de orden:</strong> {orderId}</p>
                    {paymentId && (
                      <p><strong>ID de pago:</strong> {paymentId}</p>
                    )}
                  </>
                ) : (
                  <p><em>Modo de prueba - Sin orden real</em></p>
                )}
              </div>
            )}

            {(paymentStatus === 'pending' || paymentStatus === 'in_process') && (
              <div className="payment-pending-actions">
                <button
                  onClick={checkPaymentStatus}
                  disabled={isChecking}
                  className="payment-pending-check-btn"
                >
                  {isChecking ? 'Verificando...' : 'Verificar Ahora'}
                </button>
                
                <button
                  onClick={() => navigate('/mis-pedidos')}
                  className="payment-pending-orders-btn"
                >
                  Ver Mis Pedidos
                </button>
              </div>
            )}

            {paymentStatus === 'rejected' && (
              <div className="payment-pending-actions">
                <button
                  onClick={() => navigate('/carrito-detalle')}
                  className="payment-pending-retry-btn"
                >
                  Intentar Nuevamente
                </button>
              </div>
            )}

            <div className="payment-pending-note">
              <p>
                <strong>Nota:</strong> Esta página se actualiza automáticamente cada 10 segundos.
                También recibirás una notificación cuando tu pago sea confirmado.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPendingPage;

