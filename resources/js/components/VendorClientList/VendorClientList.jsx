import React, { useState, useEffect } from 'react';
import { listMyBuyers } from '../../api/vendorApi';
import AccountStatementModal from '../AccountStatementModal/AccountStatementModal';
import './VendorClientList.css';

/**
 * Lista de compradores asociados al vendedor.
 * Solo muestra el botón de "Estado de cuenta ADM" (📋).
 */
const VendorClientList = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showAccountStatement, setShowAccountStatement] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await listMyBuyers();
        if (!cancelled) setBuyers(data.buyers || []);
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar clientes: ' + err.message, 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

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
      <h2 className="vendor-client-list__title">Mis Clientes</h2>

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