import React, { useEffect, useState } from 'react';
import './ExternalAccountStatementModal.css';

const ExternalAccountStatementModal = ({ isOpen, onClose, clientId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchExternalAccountStatement();
    }
  }, [isOpen, clientId]);

  const fetchExternalAccountStatement = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/admin/clients/${clientId}/external-account-statement`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
        },
      });

      const payload = await response.json();

      if (response.ok && payload.success) {
        setData(payload);
      } else {
        setError(payload.message || 'Error al cargar el estado de cuenta');
      }
    } catch {
      setError('Error de conexión al cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (amount) => {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (!isOpen) return null;

  const summary = data?.summary ?? {};
  const documentos = data?.documentos ?? [];

  return (
    <div className="ext-account-modal__overlay" onClick={onClose}>
      <div className="ext-account-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="ext-account-modal__header">
          <div>
            <h3 className="ext-account-modal__title">Estado de Cuenta ADM</h3>
            {data?.nombre && (
              <p className="ext-account-modal__client-name">{data.nombre}</p>
            )}
            {data?.client?.email && (
              <p className="ext-account-modal__client-email">{data.client.email}</p>
            )}
          </div>
          <button
            type="button"
            className="ext-account-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="ext-account-modal__body">
          {loading ? (
            <div className="ext-account-modal__state">
              <div className="ext-account-modal__spinner" />
              <p>Cargando estado de cuenta...</p>
            </div>
          ) : error ? (
            <div className="ext-account-modal__state ext-account-modal__state--error">
              <p>{error}</p>
              <button type="button" className="ext-account-modal__retry" onClick={fetchExternalAccountStatement}>
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="ext-account-modal__summary">
                <div className="ext-account-modal__summary-item">
                  <label>Límite de Crédito</label>
                  <span>{formatCurrency(summary.limite_credito)}</span>
                </div>
                <div className="ext-account-modal__summary-item">
                  <label>Saldo</label>
                  <span>{formatCurrency(summary.saldo)}</span>
                </div>
                <div className="ext-account-modal__summary-item">
                  <label>Vencido</label>
                  <span className={Number(summary.vencido) > 0 ? 'ext-account-modal__text-danger' : ''}>
                    {formatCurrency(summary.vencido)}
                  </span>
                </div>
                <div className="ext-account-modal__summary-item">
                  <label>Disponible</label>
                  <span>{formatCurrency(summary.disponible)}</span>
                </div>
              </div>

              {documentos.length === 0 ? (
                <div className="ext-account-modal__state">
                  <p>No hay movimientos registrados.</p>
                </div>
              ) : (
                <div className="ext-account-modal__table-wrap">
                  <table className="ext-account-modal__table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Vence</th>
                        <th>Atraso</th>
                        <th>Refer</th>
                        <th>Doc</th>
                        <th>Cargo</th>
                        <th>Abono</th>
                        <th>Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentos.map((row, index) => (
                        <tr key={`${row.refer}-${index}`}>
                          <td>{row.fecha || '—'}</td>
                          <td>{row.vence || '—'}</td>
                          <td className="ext-account-modal__num">{formatNumber(row.atraso)}</td>
                          <td>{row.refer || '—'}</td>
                          <td>{row.doc || '—'}</td>
                          <td className="ext-account-modal__num">{formatCurrency(row.cargo)}</td>
                          <td className="ext-account-modal__num">{formatCurrency(row.abono)}</td>
                          <td className="ext-account-modal__num ext-account-modal__saldo">
                            {formatCurrency(row.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="ext-account-modal__footer">
          <button type="button" className="ext-account-modal__close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalAccountStatementModal;
