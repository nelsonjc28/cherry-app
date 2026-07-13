import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useCartStore from '../../store/cartStore';
import useUserStore from '../../store/userStore';
import {
  listMyBuyers,
  getMyBuyerAddresses,
  vendorCheckout,
} from '../../api/vendorApi';
import {
  summarizeVolumeFromPricingLines,
  discountedMerchandiseForSubset,
} from '../../utils/cartVolumePricing';
import { buildStreetWithNumbers } from '../../utils/addressDisplay';
import './VendorPages.css';

const VendorCheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const cartStore = useCartStore();
  const cartItems = cartStore?.items || [];
  const totalPrice = cartStore?.totalPrice || 0;
  const clearCart = cartStore?.clearCart || (() => {});

  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliveryType, setDeliveryType] = useState('envio');
  const [shippingAmount, setShippingAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(true);

  // Carga compradores elegibles (oro/diamante) del vendor
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingBuyers(true);
        const data = await listMyBuyers();
        if (!cancelled) setBuyers(data.buyers || []);
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar compradores: ' + err.message, 'error');
        }
      } finally {
        if (!cancelled) setLoadingBuyers(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cuando cambia el buyer, carga sus direcciones
  useEffect(() => {
    if (!selectedBuyerId) {
      setAddresses([]);
      setSelectedAddressId('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getMyBuyerAddresses(selectedBuyerId);
        if (!cancelled) {
          setAddresses(data.addresses || []);
          // Si hay dirección por defecto, autoseleccionarla
          const def = (data.addresses || []).find((a) => a.is_default);
          setSelectedAddressId(def ? def.id : (data.addresses?.[0]?.id ?? ''));
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar direcciones: ' + err.message, 'error');
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedBuyerId]);

  // === Totales (alineado con PriceService del backend) ===
  const totals = useMemo(() => {
    if (cartItems.length === 0) {
      return {
        subtotal: 0,
        discountedMerchandise: 0,
        total: 0,
      };
    }
    const lines = cartItems.map((it) => ({
      price: parseFloat(it.price ?? it.precio1 ?? 0),
      quantity: parseInt(it.quantity ?? 1),
      desc_promo: parseFloat(it.desc_promo ?? 0),
      user_offer_applies: !!it.user_offer_applies,
    }));
    const summary = summarizeVolumeFromPricingLines(user, lines);
    const discountedMerchandise = parseFloat(summary.discounted_merchandise ?? 0);
    const subtotal = parseFloat(summary.lines_sum ?? 0);
    return {
      subtotal,
      discountedMerchandise,
      total: discountedMerchandise + parseFloat(shippingAmount || 0),
    };
  }, [cartItems, user, shippingAmount]);

  const handleConfirm = async () => {
    // Validaciones
    if (!selectedBuyerId) {
      Swal.fire('Selecciona un cliente', 'Debes elegir el cliente al que se cargará este pedido.', 'warning');
      return;
    }
    if (cartItems.length === 0) {
      Swal.fire('Carrito vacío', 'Agrega productos antes de confirmar.', 'warning');
      return;
    }
    if (deliveryType === 'envio' && !selectedAddressId) {
      Swal.fire('Selecciona una dirección', 'Para envío debes elegir una dirección del cliente.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        buyer_id: Number(selectedBuyerId),
        delivery_type: deliveryType,
        address_id: deliveryType === 'envio' ? Number(selectedAddressId) : null,
        shipping_amount: parseFloat(shippingAmount || 0),
        items: cartItems.map((it) => ({
          product_id: String(it.id ?? it.product_id),
          name: it.name ?? it.descripcion ?? '',
          quantity: parseInt(it.quantity ?? 1),
          price: parseFloat(it.price ?? it.precio1 ?? 0),
          size: it.size ?? it.talla ?? null,
          color: it.color ?? null,
          barcode: it.barcode ?? null,
          detalle_id: it.detalle_id ?? null,
          desc_promo: parseFloat(it.desc_promo ?? 0),
          user_offer_applies: !!it.user_offer_applies,
          is_coming_soon: !!it.is_coming_soon,
          is_out_of_stock_encargo: !!it.is_out_of_stock_encargo,
        })),
        subtotal: totals.subtotal,
        discounted_total: totals.discountedMerchandise,
        total_amount: totals.total,
      };

      const result = await vendorCheckout(payload);

      if (window.showToast) {
        window.showToast(
          result?.message || 'Pedido registrado exitosamente',
          'success',
          4000,
        );
      }

      await clearCart();

      // El pedido queda "pendiente_pago" → redirigir al listado de pedidos
      navigate('/vendor/orders', { replace: true });
    } catch (err) {
      const message = err.errors
        ? Object.values(err.errors).flat().join('\n')
        : err.message;
      Swal.fire('No se pudo confirmar', message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="vendor-page">
        <header className="vendor-page__header">
          <h1>Checkout de Vendedor</h1>
        </header>
        <div className="vendor-page__empty">
          <h3>No hay productos en el carrito</h3>
          <p>Agrega productos desde el catálogo antes de generar un pedido para un cliente.</p>
          <button className="vendor-btn vendor-btn--primary" onClick={() => navigate('/')}>
            Ir al catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <header className="vendor-page__header">
        <h1>Checkout de Vendedor</h1>
        <p>
          Crea un pedido directo en nombre de uno de tus clientes asociados.
          El pedido queda <strong>pendiente de pago</strong> hasta que el cliente o
          el administrador liquiden.
        </p>
      </header>

      <div className="vendor-checkout">
        <section className="vendor-checkout__panel">
          <h2>1. Cliente</h2>
          {loadingBuyers ? (
            <div className="vendor-page__loading-inline">Cargando compradores...</div>
          ) : buyers.length === 0 ? (
            <div className="vendor-page__empty-inline">
              No tienes compradores asociados con categoría Oro o Diamante.
            </div>
          ) : (
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="vendor-checkout__select"
            >
              <option value="">— Selecciona un cliente —</option>
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.first_name} {b.last_name} — {b.seller_category === 'oro' ? 'Oro' : 'Diamante'}
                  {b.email ? ` (${b.email})` : ''}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="vendor-checkout__panel">
          <h2>2. Entrega</h2>
          <div className="vendor-checkout__radio-row">
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="envio"
                checked={deliveryType === 'envio'}
                onChange={() => setDeliveryType('envio')}
                disabled={!selectedBuyerId}
              />
              Envío a domicilio
            </label>
            <label>
              <input
                type="radio"
                name="deliveryType"
                value="retiro"
                checked={deliveryType === 'retiro'}
                onChange={() => setDeliveryType('retiro')}
                disabled={!selectedBuyerId}
              />
              Retiro en tienda
            </label>
          </div>

          {deliveryType === 'envio' && (
            <>
              {selectedBuyerId && addresses.length === 0 ? (
                <div className="vendor-page__loading-inline">Cargando direcciones...</div>
              ) : (
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="vendor-checkout__select"
                  disabled={!selectedBuyerId || addresses.length === 0}
                >
                  <option value="">— Selecciona una dirección —</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {buildStreetWithNumbers(a)} — {a.city || a.municipality || ''}
                      {a.is_default ? ' (predeterminada)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <div className="vendor-checkout__shipping">
                <label>
                  Costo de envío (calculado en frontend): $
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                    className="vendor-checkout__shipping-input"
                  />
                </label>
              </div>
            </>
          )}
        </section>

        <section className="vendor-checkout__panel">
          <h2>3. Productos ({cartItems.length})</h2>
          <ul className="vendor-checkout__items">
            {cartItems.map((it, idx) => (
              <li key={idx} className="vendor-checkout__item">
                <div className="vendor-checkout__item-name">
                  {it.name ?? it.descripcion}
                  {it.size && ` · Talla ${it.size}`}
                  {it.color && ` · ${it.color}`}
                </div>
                <div className="vendor-checkout__item-qty">x{it.quantity}</div>
                <div className="vendor-checkout__item-price">
                  ${(parseFloat(it.price ?? 0) * parseInt(it.quantity ?? 1)).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="vendor-checkout__panel vendor-checkout__summary">
          <h2>Resumen</h2>
          <div className="vendor-checkout__summary-row">
            <span>Subtotal mercancía</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="vendor-checkout__summary-row">
            <span>Descuentos por volumen</span>
            <span>
              -${(totals.subtotal - totals.discountedMerchandise).toFixed(2)}
            </span>
          </div>
          <div className="vendor-checkout__summary-row">
            <span>Envío</span>
            <span>${parseFloat(shippingAmount || 0).toFixed(2)}</span>
          </div>
          <div className="vendor-checkout__summary-row vendor-checkout__summary-row--total">
            <strong>Total</strong>
            <strong>${totals.total.toFixed(2)}</strong>
          </div>

          <button
            onClick={handleConfirm}
            disabled={submitting || !selectedBuyerId}
            className="vendor-btn vendor-btn--primary vendor-btn--block"
          >
            {submitting ? 'Registrando pedido...' : 'Confirmar Pedido Directo'}
          </button>
          <p className="vendor-checkout__legal">
            El pedido será enviado a la API externa y quedará como{' '}
            <strong>pendiente de pago</strong> hasta liquidación.
          </p>
        </section>
      </div>
    </div>
  );
};

export default VendorCheckoutPage;