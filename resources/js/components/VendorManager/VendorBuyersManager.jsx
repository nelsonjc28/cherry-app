import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import {
  listVendorBuyers,
  attachVendorBuyer,
  detachVendorBuyer,
  listEligibleClients,
} from '../../api/adminVendors';
import './VendorManager.css';

/**
 * Modal para gestionar los compradores asociados a un vendor.
 * Carga:
 *   - Compradores ya asociados (GET /api/admin/vendors/{id}/buyers)
 *   - Clientes elegibles para asociar (GET /api/admin/clients/eligible-for-vendor)
 *       con ?exclude_vendor_id={id} para no mostrar los ya vinculados.
 */
const VendorBuyersManager = ({ vendor, onClose, onChanged }) => {
  const [buyers, setBuyers] = useState([]);
  const [eligibleClients, setEligibleClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      const [buyersRes, eligibleRes] = await Promise.all([
        listVendorBuyers(vendor.id),
        listEligibleClients({ exclude_vendor_id: vendor.id, search }),
      ]);
      setBuyers(buyersRes.buyers || []);
      setEligibleClients(eligibleRes.clients || []);
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar compradores: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor.id]);

  useEffect(() => {
    // Recargar elegibles al cambiar la búsqueda
    const t = setTimeout(() => {
      listEligibleClients({ exclude_vendor_id: vendor.id, search })
        .then((data) => setEligibleClients(data.clients || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAttach = async () => {
    if (!selectedClientId) {
      Swal.fire('Selecciona un cliente', 'Debes elegir un cliente de la lista.', 'warning');
      return;
    }
    try {
      await attachVendorBuyer(vendor.id, Number(selectedClientId));
      if (window.showToast) {
        window.showToast('Comprador asociado exitosamente', 'success', 3000);
      }
      setSelectedClientId('');
      await refresh();
      if (onChanged) onChanged();
    } catch (err) {
      const message = err.errors
        ? Object.values(err.errors).flat().join('\n')
        : err.message;
      Swal.fire('No se pudo asociar', message, 'error');
    }
  };

  const handleDetach = async (buyer) => {
    const result = await Swal.fire({
      title: '¿Desvincular comprador?',
      html: `Vas a desvincular a <strong>${buyer.first_name} ${buyer.last_name}</strong> de este vendedor.<br/>El cliente ya no aparecerá en sus opciones de checkout.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, desvincular',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await detachVendorBuyer(vendor.id, buyer.id);
      if (window.showToast) {
        window.showToast('Comprador desvinculado', 'success', 3000);
      }
      await refresh();
      if (onChanged) onChanged();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const categoryLabel = useMemo(
    () => ({
      oro: 'Oro',
      diamante: 'Diamante',
    }),
    [],
  );

  const eligibleToShow = useMemo(() => eligibleClients, [eligibleClients]);

  return (
    <div className="vendor-manager__form-overlay">
      <div className="vendor-manager__form vendor-manager__form--wide">
        <div className="vendor-manager__form-header">
          <h3>
            Compradores de {vendor.first_name} {vendor.last_name}
          </h3>
          <button
            type="button"
            className="vendor-manager__form-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="vendor-manager__buyers-content">
          {/* Asociar nuevo */}
          <div className="vendor-manager__buyers-section">
            <h4>Asociar nuevo comprador</h4>
            <p className="vendor-manager__hint">
              Solo se muestran clientes con categoría <strong>Oro</strong> o{' '}
              <strong>Diamente</strong> que aún no estén asociados.
            </p>
            <div className="vendor-manager__buyers-attach-row">
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="vendor-manager__buyers-search-input"
              />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="vendor-manager__select"
              >
                <option value="">— Selecciona un cliente —</option>
                {eligibleToShow.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({categoryLabel[c.seller_category] || c.seller_category}) — {c.email || c.phone}
                  </option>
                ))}
              </select>
              <CherryButton
                onClick={handleAttach}
                variant="red"
                size="small"
                disabled={!selectedClientId}
              >
                Asociar
              </CherryButton>
            </div>
          </div>

          {/* Listado de asociados */}
          <div className="vendor-manager__buyers-section">
            <h4>
              Compradores asociados ({buyers.length})
            </h4>
            {loading ? (
              <div className="vendor-manager__loading-inline">Cargando...</div>
            ) : buyers.length === 0 ? (
              <div className="vendor-manager__empty-inline">
                Este vendedor aún no tiene compradores asociados.
              </div>
            ) : (
              <ul className="vendor-manager__buyers-list">
                {buyers.map((b) => {
                  const eligible = ['oro', 'diamante'].includes(b.seller_category);
                  return (
                    <li key={b.id} className="vendor-manager__buyer-item">
                      <div className="vendor-manager__buyer-info">
                        <div className="vendor-manager__buyer-name">
                          {b.first_name} {b.last_name}
                        </div>
                        <div className="vendor-manager__buyer-email">{b.email || '—'}</div>
                        <div className="vendor-manager__buyer-meta">
                          <span
                            className={`vendor-manager__category-badge vendor-manager__category-badge--${b.seller_category || 'none'}`}
                          >
                            {categoryLabel[b.seller_category] || b.seller_category || 'Sin categoría'}
                          </span>
                          {!eligible && (
                            <span className="vendor-manager__ineligible-tag">
                              ⚠ No elegible para nuevos pedidos
                            </span>
                          )}
                        </div>
                      </div>
                      <CherryButton
                        onClick={() => handleDetach(b)}
                        variant="outline"
                        size="small"
                      >
                        Desvincular
                      </CherryButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorBuyersManager;