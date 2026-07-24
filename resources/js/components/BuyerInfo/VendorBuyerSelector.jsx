import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listMyBuyers } from '../../api/vendorApi';
import './VendorBuyerSelector.css';

/**
 * Selector de clientes tipo Select2 para vendedores.
 * Se muestra dentro de la sección "Datos del comprador" en el carrito-detalle.
 *
 * Props:
 *   selectedBuyer   - objeto del comprador seleccionado (o null)
 *   onBuyerChange    - callback(buyer) al seleccionar
 *   disabled         - deshabilitar el selector
 *   className        - clase CSS extra
 */
const VendorBuyerSelector = ({ selectedBuyer, onBuyerChange, disabled = false, className = '' }) => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Cargar compradores del vendedor
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await listMyBuyers();
        if (!cancelled) {
          setBuyers(data.buyers || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('[VendorBuyerSelector] Error:', err);
        if (!cancelled) {
          setBuyers([]);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Filtrar por búsqueda
  const filteredBuyers = buyers.filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const fullName = `${b.first_name || ''} ${b.last_name || ''} ${b.middle_name || ''}`.toLowerCase();
    const email = (b.email || '').toLowerCase();
    const phone = (b.phone || '');
    return fullName.includes(q) || email.includes(q) || phone.includes(q);
  });

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((buyer) => {
    onBuyerChange(buyer);
    setSearchTerm('');
    setIsOpen(false);
  }, [onBuyerChange]);

  const handleClear = useCallback(() => {
    onBuyerChange(null);
    setSearchTerm('');
  }, [onBuyerChange]);

  const handleToggle = useCallback(() => {
    if (!disabled && !loading) {
      setIsOpen(prev => !prev);
      setSearchTerm('');
    }
  }, [disabled, loading]);

  return (
    <div className={`cart-order-summary__section ${className}`} ref={wrapperRef}>
      <div className="cart-order-summary__section-title">Datos del comprador</div>
      <div className="cart-order-summary__section-content">
        {loading ? (
          <div className="vendor-buyer__loading">Cargando clientes...</div>
        ) : buyers.length === 0 ? (
          <div className="vendor-buyer__empty">
            <p>No tienes clientes asignados.</p>
            <p className="vendor-buyer__hint">
              Un administrador debe asignarte clientes configurando tu ID de vendedor.
            </p>
          </div>
        ) : (
          <div className="vendor-buyer__select-wrapper">
            {/* Trigger: parece un select nativo */}
            <div
              className={`vendor-buyer__trigger ${isOpen ? 'vendor-buyer__trigger--open' : ''} ${disabled ? 'vendor-buyer__trigger--disabled' : ''}`}
              onClick={handleToggle}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
            >
              {selectedBuyer ? (
                <div className="vendor-buyer__trigger-selected">
                  <span className="vendor-buyer__trigger-name">
                    {selectedBuyer.first_name} {selectedBuyer.last_name}
                  </span>
                  <span className={`vendor-buyer__trigger-badge vendor-buyer__trigger-badge--${selectedBuyer.seller_category}`}>
                    {selectedBuyer.seller_category === 'oro' ? 'Oro' : 'Diamante'}
                  </span>
                </div>
              ) : (
                <span className="vendor-buyer__trigger-placeholder">— Selecciona un cliente —</span>
              )}
              <span className="vendor-buyer__trigger-arrow">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Dropdown con buscador */}
            {isOpen && (
              <div className="vendor-buyer__dropdown" role="listbox">
                <div className="vendor-buyer__search-wrapper">
                  <input
                    type="text"
                    className="vendor-buyer__search-input"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="vendor-buyer__options">
                  {filteredBuyers.length === 0 ? (
                    <div className="vendor-buyer__no-results">
                      {searchTerm
                        ? `No se encontraron clientes con "${searchTerm}"`
                        : 'No hay clientes disponibles'}
                    </div>
                  ) : (
                    filteredBuyers.map((b) => (
                      <div
                        key={b.id}
                        className={`vendor-buyer__option ${selectedBuyer?.id === b.id ? 'vendor-buyer__option--selected' : ''}`}
                        onClick={() => handleSelect(b)}
                        role="option"
                        aria-selected={selectedBuyer?.id === b.id}
                      >
                        <div className="vendor-buyer__option-info">
                          <div className="vendor-buyer__option-name">
                            {b.first_name} {b.last_name}
                          </div>
                          <div className="vendor-buyer__option-detail">
                            {(b.email || b.phone) && <span>{b.email || b.phone}</span>}
                          </div>
                        </div>
                        <span className={`vendor-buyer__option-badge vendor-buyer__option-badge--${b.seller_category}`}>
                          {b.seller_category === 'oro' ? 'Oro' : 'Diamante'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorBuyerSelector;