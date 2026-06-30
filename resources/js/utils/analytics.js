const CONSENT_STORAGE_KEY = 'cherry_cookie_consent';

export function getGa4MeasurementId() {
  const fromVite = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (typeof fromVite === 'string' && fromVite.trim() !== '') {
    return fromVite.trim();
  }
  const meta = document.querySelector('meta[name="ga4-measurement-id"]');
  return meta?.content?.trim() || '';
}

export function isGa4Configured() {
  return getGa4MeasurementId().length > 0;
}

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsent()?.analytics === true;
}

function gtag(...args) {
  if (typeof window.gtag !== 'function') return;
  window.gtag(...args);
}

export function updateGa4Consent(granted) {
  if (!isGa4Configured()) return;
  gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
  });
}

export function setCookieConsent({ analytics, marketing = false }) {
  localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ analytics: !!analytics, marketing: !!marketing, ts: Date.now() }),
  );
  updateGa4Consent(!!analytics);
  if (analytics) {
    trackPageView(`${window.location.pathname}${window.location.search}`, document.title);
  }
}

export function bootstrapAnalyticsConsent() {
  if (!isGa4Configured()) return;
  if (hasAnalyticsConsent()) {
    updateGa4Consent(true);
  }
}

export function trackPageView(pagePath, pageTitle) {
  if (!hasAnalyticsConsent()) return;
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });
}

export function toGa4Item(item, quantityOverride) {
  const qty = quantityOverride ?? item?.quantity ?? 1;
  return {
    item_id: String(item?.id_articulo || item?.product_id || item?.id || ''),
    item_name: item?.descripcion || item?.title || item?.name || '',
    price: Number(item?.price ?? item?.precio ?? 0),
    quantity: Number(qty) || 1,
  };
}

export function trackViewItem(product) {
  if (!hasAnalyticsConsent() || !product) return;
  const item = toGa4Item(product, 1);
  gtag('event', 'view_item', {
    currency: 'MXN',
    value: item.price,
    items: [item],
  });
}

export function trackAddToCart(product, quantity = 1) {
  if (!hasAnalyticsConsent() || !product) return;
  const item = toGa4Item(product, quantity);
  gtag('event', 'add_to_cart', {
    currency: 'MXN',
    value: item.price * item.quantity,
    items: [item],
  });
}

export function trackBeginCheckout(items, value) {
  if (!hasAnalyticsConsent() || !items?.length) return;
  gtag('event', 'begin_checkout', {
    currency: 'MXN',
    value: Number(value) || 0,
    items: items.map((item) => toGa4Item(item)),
  });
}

export function trackPurchase({ transactionId, value, items = [] }) {
  if (!hasAnalyticsConsent() || !transactionId) return;
  gtag('event', 'purchase', {
    transaction_id: String(transactionId),
    currency: 'MXN',
    value: Number(value) || 0,
    items: items.map((item) => toGa4Item(item)),
  });
}

export function mapOrderItemsToGa4(orderItems) {
  if (!Array.isArray(orderItems)) return [];
  return orderItems.map((item) => ({
    id_articulo: item.product_id,
    descripcion: item.product_name || item.name,
    price: item.price ?? item.unit_price,
    quantity: item.quantity,
  }));
}
