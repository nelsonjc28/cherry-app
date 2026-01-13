import React, { useState, useEffect } from 'react';
import { adminOrderService } from '../../services/api';
import './AccountStatementModal.css';

const AccountStatementModal = ({ isOpen, onClose, userId = null }) => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAsPaid, setMarkingAsPaid] = useState(false);
  const [orderToMarkAsPaid, setOrderToMarkAsPaid] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAccountStatements();
    }
  }, [isOpen, userId]);

  const fetchAccountStatements = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Si userId está presente, es una consulta de admin para un cliente específico
      const url = userId 
        ? `/api/admin/clients/${userId}/account-statements`
        : '/api/account-statements';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Guardar información del cliente si está disponible
          const statementsWithClient = (data.statements || []).map(statement => ({
            ...statement,
            client: data.client || null
          }));
          setStatements(statementsWithClient);
        } else {
          setError(data.message || 'Error al cargar los estados de cuenta');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Error al cargar los estados de cuenta');
      }
    } catch (err) {
      setError('Error de conexión al cargar los estados de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleMarkCreditAsPaid = (statement) => {
    setOrderToMarkAsPaid(statement);
    setShowMarkAsPaidModal(true);
  };

  const confirmMarkCreditAsPaid = async () => {
    if (!orderToMarkAsPaid || !orderToMarkAsPaid.order_id) return;

    try {
      setMarkingAsPaid(true);
      const response = await adminOrderService.markCreditOrderAsPaid(orderToMarkAsPaid.order_id);
      
      if (response.data.success) {
        // Recargar los estados de cuenta
        await fetchAccountStatements();
        
        if (window.showToast) {
          window.showToast(
            `Orden marcada como pagada. Crédito restaurado: ${formatCurrency(response.data.data?.credit_restored || 0)}`,
            'success'
          );
        }
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al marcar la orden como pagada', 'error');
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Error de conexión al marcar la orden como pagada';
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    } finally {
      setMarkingAsPaid(false);
      setShowMarkAsPaidModal(false);
      setOrderToMarkAsPaid(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="account-statement-modal__overlay" onClick={onClose}>
      <div className="account-statement-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="account-statement-modal__header">
          <div>
            <h3 className="account-statement-modal__title">Estados de Cuenta</h3>
            {userId && statements.length > 0 && statements[0]?.client && (
              <p className="account-statement-modal__client-name">
                Cliente: {statements[0].client.name} ({statements[0].client.email})
              </p>
            )}
          </div>
          <button 
            className="account-statement-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="account-statement-modal__body">
          {loading ? (
            <div className="account-statement-modal__loading">
              <div className="loading-spinner"></div>
              <p>Cargando estados de cuenta...</p>
            </div>
          ) : error ? (
            <div className="account-statement-modal__error">
              <p>{error}</p>
              <button 
                className="account-statement-modal__retry-btn"
                onClick={fetchAccountStatements}
              >
                Reintentar
              </button>
            </div>
          ) : statements.length === 0 ? (
            <div className="account-statement-modal__empty">
              <p>No hay estados de cuenta disponibles.</p>
            </div>
          ) : (
            <div className="account-statement-modal__table-container">
              <table className="account-statement-modal__table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cargo</th>
                    <th>Pagado</th>
                    <th>Pendiente</th>
                    <th>Referencia</th>
                    {userId && <th>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {statements.map((statement, index) => {
                    const pendiente = parseFloat(statement.pendiente || 0);
                    const pagado = parseFloat(statement.pagado || statement.cargo || 0);
                    
                    return (
                      <tr key={index}>
                        <td className="account-statement-modal__date-cell">
                          {formatDate(statement.fecha)}
                        </td>
                        <td className="account-statement-modal__charge-cell">
                          {formatCurrency(statement.cargo || 0)}
                        </td>
                        <td className="account-statement-modal__paid-cell">
                          {formatCurrency(pagado)}
                        </td>
                        <td className="account-statement-modal__pending-cell" style={{
                          color: pendiente > 0 ? '#d32f2f' : '#28a745',
                          fontWeight: pendiente > 0 ? '600' : '400'
                        }}>
                          {formatCurrency(pendiente)}
                        </td>
                        <td className="account-statement-modal__reference-cell">
                          {statement.referencia || '-'}
                        </td>
                        {userId && (
                          <td className="account-statement-modal__actions-cell">
                            {statement.paid_with_credit && statement.credit_used > 0 && (
                              <button
                                className="account-statement-modal__mark-paid-btn"
                                onClick={() => handleMarkCreditAsPaid(statement)}
                                title="Marcar como Pagada"
                              >
                                💰
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de confirmación para marcar orden a crédito como pagada */}
        {showMarkAsPaidModal && orderToMarkAsPaid && (
          <div className="account-statement-modal__mark-paid-overlay" onClick={() => setShowMarkAsPaidModal(false)}>
            <div className="account-statement-modal__mark-paid-modal" onClick={(e) => e.stopPropagation()}>
              <div className="account-statement-modal__mark-paid-header">
                <h3>Marcar Orden como Pagada</h3>
                <button 
                  className="account-statement-modal__mark-paid-close"
                  onClick={() => setShowMarkAsPaidModal(false)}
                  disabled={markingAsPaid}
                >
                  ×
                </button>
              </div>
              <div className="account-statement-modal__mark-paid-body">
                <p>¿Estás seguro de que deseas marcar la orden <strong>{orderToMarkAsPaid.referencia}</strong> como pagada?</p>
                <p>Esta acción:</p>
                <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                  <li>Marcará la orden como <strong>pagada</strong></li>
                  <li>Restaurará <strong>{formatCurrency(orderToMarkAsPaid.credit_used || 0)}</strong> al crédito disponible del cliente</li>
                  <li>Enviará una notificación al cliente</li>
                </ul>
              </div>
              <div className="account-statement-modal__mark-paid-footer">
                <button
                  className="account-statement-modal__mark-paid-cancel"
                  onClick={() => setShowMarkAsPaidModal(false)}
                  disabled={markingAsPaid}
                >
                  Cancelar
                </button>
                <button
                  className="account-statement-modal__mark-paid-confirm"
                  onClick={confirmMarkCreditAsPaid}
                  disabled={markingAsPaid}
                >
                  {markingAsPaid ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountStatementModal;

