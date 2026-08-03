/**
 * Servicios HTTP para el módulo admin de vendedores.
 * Patrón: mismo estilo que OperatorManager (fetch directo con Bearer token).
 */

const TOKEN_KEY = 'token';
const getToken = () => localStorage.getItem(TOKEN_KEY);

const authHeaders = () => ({
  'Authorization': `Bearer ${getToken()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
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

// ============ CRUD de vendedores ============

export const listVendors = () =>
  fetch('/api/admin/vendors', { headers: authHeaders() }).then(handle);

export const getVendor = (id) =>
  fetch(`/api/admin/vendors/${id}`, { headers: authHeaders() }).then(handle);

export const createVendor = (payload) =>
  fetch('/api/admin/vendors', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handle);

export const updateVendor = (id, payload) =>
  fetch(`/api/admin/vendors/${id}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }).then(handle);

export const deleteVendor = (id) =>
  fetch(`/api/admin/vendors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle);

// ============ Gestión de compradores asociados ============

export const listVendorBuyers = (vendorId, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`/api/admin/vendors/${vendorId}/buyers${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  }).then(handle);
};

export const attachVendorBuyer = (vendorId, buyerId, isActive = true) =>
  fetch(`/api/admin/vendors/${vendorId}/buyers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ buyer_id: buyerId, is_active: isActive }),
  }).then(handle);

export const detachVendorBuyer = (vendorId, buyerId) =>
  fetch(`/api/admin/vendors/${vendorId}/buyers/${buyerId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle);

// ============ Permiso de cambio de categoría ============

/**
 * Otorga o revoca el permiso de un vendedor para cambiar las
 * categorías de sus clientes asociados.
 * @param {number} vendorId
 * @param {boolean} canChangeCategory
 */
export const toggleVendorCategoryPermission = (vendorId, canChangeCategory) =>
  fetch(`/api/admin/vendors/${vendorId}/category-permission`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ can_change_category: canChangeCategory }),
  }).then(handle);

// ============ Clientes elegibles (oro/diamante) ============

export const listEligibleClients = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`/api/admin/clients/eligible-for-vendor${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  }).then(handle);
};