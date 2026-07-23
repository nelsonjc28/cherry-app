/**
 * Servicios HTTP para el módulo vendor (rol vendedor).
 * Endpoints /api/vendor/* — todos requieren token JWT y rol 'vendedor'.
 */

const TOKEN_KEY = 'token';
const getToken = () => localStorage.getItem(TOKEN_KEY);

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

async function handle(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Error en la solicitud';
    const error = new Error(message);
    error.errors = data?.errors;
    error.status = response.status;
    throw error;
  }
  return data;
}

// ============ Compradores ============

export const listMyBuyers = () =>
  fetch('/api/vendor/buyers', { headers: authHeaders() }).then(handle);

export const getMyBuyer = (id) =>
  fetch(`/api/vendor/buyers/${id}`, { headers: authHeaders() }).then(handle);

export const getMyBuyerAddresses = (id) =>
  fetch(`/api/vendor/buyers/${id}/addresses`, { headers: authHeaders() }).then(handle);

// ============ Órdenes ============

export const listMyOrders = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`/api/vendor/orders${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  }).then(handle);
};

export const getMyOrder = (id) =>
  fetch(`/api/vendor/orders/${id}`, { headers: authHeaders() }).then(handle);

// ============ Checkout ============

export const vendorCheckout = (payload) =>
  fetch('/api/vendor/checkout', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handle);

// ============ Perfil del vendedor ============

export const getMyProfile = () =>
  fetch('/api/vendor/profile', { headers: authHeaders() }).then(handle);

export const updateMyIdvendedor = (idvendedor) =>
  fetch('/api/vendor/profile/idvendedor', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ idvendedor }),
  }).then(handle);