import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { listMyBuyers } from '../../api/vendorApi';
import { clientService } from '../../services/api';
import AccountStatementModal from '../AccountStatementModal/AccountStatementModal';
import './VendorClientList.css';

/**
 * Lista de compradores asociados al vendedor.
 * Muestra el botón de sincronizar y el botón "Estado de cuenta ADM" (📋).
 */
const VendorClientList = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showAccountStatement, setShowAccountStatement] = useState(false);

  const loadBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listMyBuyers();
      setBuyers(data.buyers || []);
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar clientes: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

  const handleSyncIdvendedor = async () => {
    if (isSyncing) return;

    const confirmed = await Swal.fire({
      title: '¿Sincronizar clientes?',
      text: 'Se actualizarán los ID de vendedor de tus clientes desde la API externa.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sincronizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b8002f',
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsSyncing(true);
      const response = await clientService.syncIdvendedor();
      const data = response?.data ?? {};
      const summary = data.summary || data;
      const total = summary.total ?? 0;
      const updated = summary.updated ?? 0;
      window.showToast(
        `Sincronización completada: ${updated} de ${total} clientes actualizados.`,
        'success'
      );
      loadBuyers();
    } catch (err) {
      window.showToast(
        'Error al sincronizar: ' + (err.message || 'desconocido'),
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredBuyers = buyers.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const fullName = `${b.first_name || ''} ${b.last_name || ''} ${b.middle_name || ''}`.toLowerCase();
    const email = (b.email || '').toLowerCase();
    const phone = (b.phone || '');
    return fullName.includes(q) || email.includes(q) || phone.includes(q);
  });

  const handleAccountStatement = (userId) => {
    setSelectedUserId(userId);
    setShowAccountStatement(true);
  };

  if (loading) {
    return <div className="vendor-client-list__loading">Cargando clientes...</div>;
  }

  return (
    <div className="vendor-client-list">
      <div className="vendor-client-list__header">
        <h2 className="vendor-client-list__title">Mis Clientes</h2>
        <button
          type="button"
          className="client-manager__sync-btn"
          onClick={handleSyncIdvendedor}
          disabled={isSyncing}
          data-tooltip="Sincronizar clientes con la API externa"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isSyncing ? 'Sincronizando…' : 'Sincronizar clientes'}
        </button>
      </div>

      <div className="vendor-client-list__search">
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="vendor-client-list__search-input"
        />
      </div>

      {filteredBuyers.length === 0 ? (
        <div className="vendor-client-list__empty">
          {searchTerm
            ? `No se encontraron clientes con "${searchTerm}"`
            : 'No tienes clientes asociados.'}
        </div>
      ) : (
        <div className="admin-orders__table-container">
          <div className="table-scroll-wrapper">
            <table className="admin-orders__table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Email / Teléfono</th>
                  <th>Categoría</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <strong>
                        {b.first_name} {b.last_name}
                      </strong>
                    </td>
                    <td className="client-manager__email-cell">
                      {b.email || '—'}
                      {b.phone && <span className="client-manager__phone-cell"> {b.phone}</span>}
                    </td>
                    <td>
                      <span className={`vendor-category-badge vendor-category-badge--${b.seller_category}`}>
                        {b.seller_category === 'oro' ? 'Oro' : 'Diamante'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="client-manager__table-icon-btn order-action-btn order-action-btn--detail"
                        data-tooltip="Estado de cuenta ADM"
                        aria-label="Estado de cuenta ADM"
                        onClick={() => handleAccountStatement(b.id)}
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAccountStatement && (
        <AccountStatementModal
          isOpen={showAccountStatement}
          onClose={() => {
            setShowAccountStatement(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />
      )}
    </div>
  );
};

export default VendorClientList;