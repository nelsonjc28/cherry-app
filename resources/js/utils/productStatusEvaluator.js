/**
 * Evaluador central de estado de un producto (Próximamente / Nuevo / Agotado / En Rebaja).
 *
 * REGLA ÚNICA — debe estar sincronizada con {@see App\Support\ProductStatusEvaluator} (PHP).
 *
 * STATUS (mutuamente excluyente):
 *   - new           → inventario > 0  AND fecha_compra dentro de últimos 30 días
 *   - in-stock      → inventario > 0  AND no es "new"
 *   - coming-soon   → inventario = 0  AND es recién llegado
 *                     AND sin oferta desc_promo activa
 *   - out-of-stock  → inventario = 0  AND no es recién llegado (o tiene desc_promo)
 *
 * FLAGS (independientes):
 *   - is_on_sale    → desc_promo > 0  ó  opc_promo === 'S'
 *
 * "Recién llegado":
 *   - stock_received_count === 0  Y
 *   - ( opc_nuevo === 'S'  OR  fecha_alta nula  OR  fecha_alta reciente (≤90d) / futura )
 *
 * NOTA: la antigua heurística "3er dígito del id = último dígito del año" fue removida.
 */

import { getTotalInventoryFromProduct } from './productUtils';

export const STATUS = Object.freeze({
  NEW: 'new',
  IN_STOCK: 'in-stock',
  COMING_SOON: 'coming-soon',
  OUT_OF_STOCK: 'out-of-stock',
});

export const FILTER = Object.freeze({
  ALL: 'all',
  IN_STOCK: 'in-stock',
  AVAILABLE: 'available',
  NEW: 'new',
  COMING_SOON: 'coming-soon',
  OUT_OF_STOCK: 'out-of-stock',
  ON_SALE: 'on-sale',
});

export const NEW_WINDOW_DAYS = 30;
export const NEW_ARRIVAL_WINDOW_DAYS = 90;

/**
 * ¿Tiene oferta/descuento activa?
 */
export function hasActiveSale(product) {
  if (!product) return false;
  const dp = Number(product.desc_promo ?? product.descPromo);
  if (!Number.isNaN(dp) && dp > 0) return true;
  return String(product.opc_promo ?? 'N').toUpperCase() === 'S';
}

/**
 * Lee un campo tolerando variantes (id_articulo/id, fecha_compra/fechaCompra, etc.)
 */
function readField(product, key, def = null) {
  if (!product) return def;
  if (product[key] !== undefined && product[key] !== null) return product[key];
  return def;
}

/**
 * ¿Es recién llegado (candidato a próximamente)?
 */
export function isNewArrival(product) {
  if (!product) return false;
  const stockReceived = parseInt(product.stock_received_count ?? product.stockReceivedCount ?? 0, 10);
  if (stockReceived > 0) return false;

  const opcNuevo = String(readField(product, 'opc_nuevo', 'N')).toUpperCase();
  if (opcNuevo === 'S') return true;

  const fechaAlta = readField(product, 'fecha_alta', null) ?? readField(product, 'fechaAlta', null);
  if (fechaAlta === null || fechaAlta === '') return true;

  const ts = parseDateTs(fechaAlta);
  if (ts === null) return false;

  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  // Reciente (≤ 90 días) o futura (diffDays negativo)
  return diffDays <= NEW_ARRIVAL_WINDOW_DAYS;
}

/**
 * Parsea una fecha (Y-m-d, d-m-Y, d/m/Y) y devuelve timestamp (o null).
 */
function parseDateTs(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  }
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Devuelve el inventario total alineado con el backend
 * ({@see getTotalInventoryFromProduct}).
 */
function computeInventoryTotal(product) {
  return getTotalInventoryFromProduct(product);
}

/**
 * Evalúa el estado y los flags de un producto.
 * @returns {{status: string, is_in_stock: boolean, is_new: boolean, is_coming_soon: boolean, is_out_of_stock: boolean, is_on_sale: boolean}}
 */
export function evaluateProductStatus(product) {
  const isOnSale = hasActiveSale(product);
  const totalInventory = computeInventoryTotal(product);

  // Caso 1: hay stock → in-stock / new
  if (totalInventory > 0) {
    const isNew = isProductNewByFechaCompra(product, totalInventory);
    return {
      status: isNew ? STATUS.NEW : STATUS.IN_STOCK,
      is_in_stock: true,
      is_new: isNew,
      is_coming_soon: false,
      is_out_of_stock: false,
      is_on_sale: isOnSale,
    };
  }

  // Caso 2: sin stock → out-of-stock / coming-soon
  if (isOnSale) {
    return {
      status: STATUS.OUT_OF_STOCK,
      is_in_stock: false,
      is_new: false,
      is_coming_soon: false,
      is_out_of_stock: true,
      is_on_sale: true,
    };
  }

  const isComingSoon = isNewArrival(product);
  return {
    status: isComingSoon ? STATUS.COMING_SOON : STATUS.OUT_OF_STOCK,
    is_in_stock: false,
    is_new: false,
    is_coming_soon: isComingSoon,
    is_out_of_stock: !isComingSoon,
    is_on_sale: isOnSale,
  };
}

/**
 * Devuelve sólo el status.
 */
export function getProductStatus(product) {
  return evaluateProductStatus(product).status;
}

/**
 * Determina si es "new" por fecha_compra (≤ 30 días) y stock > 0.
 * Equivalente a App\Support\ProductNewEvaluator::isNewLikeNuevosPage.
 */
function isProductNewByFechaCompra(product, totalInventory) {
  if (!product) return false;
  const raw = product.fecha_compra ?? product.fechaCompra;
  if (!raw) return false;
  const ts = parseDateTs(raw);
  if (!ts) return false;
  const cutoff = Date.now() - NEW_WINDOW_DAYS * 86400000;
  return ts > cutoff && totalInventory > 0.00001;
}

/**
 * Filtra una lista de productos por un filtro del enum FILTER.
 *
 * @param {Array<object>} products
 * @param {string} filter
 * @returns {Array<object>}
 */
export function filterProducts(products, filter) {
  if (!Array.isArray(products)) return [];
  if (filter === FILTER.ALL) return products;
  return products.filter((p) => matchesFilter(p, filter));
}

/**
 * ¿El producto pasa el filtro solicitado?
 */
export function matchesFilter(product, filter) {
  const evalResult = evaluateProductStatus(product);
  switch (filter) {
    case FILTER.ALL:
      return true;
    case FILTER.IN_STOCK:
      return evalResult.status === STATUS.IN_STOCK;
    case FILTER.AVAILABLE:
      return evalResult.status === STATUS.IN_STOCK || evalResult.status === STATUS.NEW;
    case FILTER.NEW:
      return evalResult.is_new === true;
    case FILTER.COMING_SOON:
      return evalResult.is_coming_soon === true;
    case FILTER.OUT_OF_STOCK:
      return evalResult.is_out_of_stock === true;
    case FILTER.ON_SALE:
      return evalResult.is_on_sale === true;
    default:
      return true;
  }
}

/**
 * Back-compat: estado para badges ('coming-soon' | 'out-of-stock' | null).
 */
export function getProductCardStockStatus(product) {
  const evalResult = evaluateProductStatus(product);
  if (evalResult.status === STATUS.IN_STOCK || evalResult.status === STATUS.NEW) return null;
  if (evalResult.status === STATUS.COMING_SOON) return 'coming-soon';
  return 'out-of-stock';
}

/**
 * Back-compat: status alineado con evaluateInventoryStatusKind del backend.
 */
export function getProductInventoryStatusKind(product) {
  return evaluateProductStatus(product).status;
}
