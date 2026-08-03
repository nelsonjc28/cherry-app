import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import {
  listVendorBuyers,
  detachVendorBuyer,
} from '../../api/adminVendors';
import './VendorManager.css';

/**
 * Modal para gestionar los compradores asociados a un vendor.
 * Carga los clientes cuyo idvendedor coincide con el del vendedor
 * (GET /api/admin/vendors/{id}/buyers).
 */
const VendorBuyersManager = ({ vendor, onClose, onChanged }) => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const buyersRes = await listVendorBuyers(vendor.id);
      setBuyers(buyersRes.buyers || []);
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

  const categoryLabel = {
    oro: 'Oro',
    diamante: 'Diamante',
    bronce: 'Bronce',
  };

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
          {/* Listado de compradores asociados */}
          <div className="vendor-manager__buyers-section">
            <h4>
              Compradores asociados ({buyers.length})
            </h4>
            {loading ? (
              <div className="vendor-manager__loading-inline">Cargando...</div>
            ) : buyers.length === 0 ? (
              <div className="vendor-manager__empty-inline">
                Este vendedor no tiene clientes asociados por idvendedor.
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