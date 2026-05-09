/**
 * Reglas globales de disponibilidad: misma lógica que {@see ProductPage} (detalle)
 * y tarjetas (getProductCardStockStatus).
 * Un producto con oferta de catálogo (desc_promo) activa nunca es "Próximamente" sin stock.
 */

export function hasActiveDescPromo(product) {
  if (!product) return false;
  const raw = product.desc_promo ?? product.descPromo;
  if (raw === null || raw === undefined || raw === '') return false;
  const n = Number(raw);
  return !Number.isNaN(n) && n > 0;
}

/**
 * Contribución de una talla al stock total: inventario_d negativo no resta.
 * Alineado con Producto::effectiveDetailInventoryContribution (PHP).
 */
export function effectiveDetailInventoryContribution(raw) {
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0) {
    return 0;
  }
  return n;
}

/**
 * Inventario total: suma de inventario_d por talla (solo valores > 0); si la suma es 0 y hay detalles, cabecera.
 * Alineado con ProductController::show y badges Próximamente / Agotado.
 */
export function getTotalInventoryFromProduct(product) {
  if (!product) {
    return 0;
  }
  const detalles = product.detalles;
  if (detalles && detalles.length > 0) {
    const fromDetails = detalles.reduce((total, detalle) => {
      return total + effectiveDetailInventoryContribution(detalle?.inventario_d);
    }, 0);
    if (fromDetails > 0.00001) {
      return fromDetails;
    }
    return effectiveDetailInventoryContribution(product.inventario ?? product.stock ?? 0);
  }
  return effectiveDetailInventoryContribution(product.inventario ?? product.stock ?? 0);
}

/**
 * Estado alineado con `getInventoryStatus` en ProductPage.
 * @returns {'in-stock'|'coming-soon'|'out-of-stock'}
 */
export function getProductInventoryStatusKind(product) {
  const totalInventory = getTotalInventoryFromProduct(product);
  const stockReceivedCount = parseInt(product?.stock_received_count || product?.stockReceivedCount || 0, 10);

  if (totalInventory > 0) {
    return 'in-stock';
  }

  if (stockReceivedCount > 0 && totalInventory === 0) {
    return 'out-of-stock';
  }

  const productId = String(product?.id || product?.id_articulo || '');
  const tercerDigito = productId.length > 2 ? productId[2] : null;
  const currentYearLastDigit = String(new Date().getFullYear() % 10);
  const isComingSoon = tercerDigito === currentYearLastDigit;

  if (isComingSoon && totalInventory === 0 && stockReceivedCount === 0 && !hasActiveDescPromo(product)) {
    return 'coming-soon';
  }

  if (totalInventory === 0 && (!isComingSoon || stockReceivedCount > 0)) {
    return 'out-of-stock';
  }

  return 'out-of-stock';
}

/**
 * Compatible con uso anterior: stock “para badge de hay piezas” (>= 0).
 * @deprecated Preferir getTotalInventoryFromProduct donde haga falta el número exacto.
 */
export function computeTotalProductStock(product) {
  return Math.max(0, getTotalInventoryFromProduct(product));
}

/**
 * Estado para badges en tarjetas: 'coming-soon' | 'out-of-stock' | null (hay stock).
 * Usa la misma regla que el detalle ({@link getProductInventoryStatusKind}).
 */
export function getProductCardStockStatus(product) {
  const kind = getProductInventoryStatusKind(product);
  if (kind === 'in-stock') {
    return null;
  }
  if (kind === 'coming-soon') {
    return 'coming-soon';
  }
  return 'out-of-stock';
}

/**
 * Oculta en catálogo externo los que tienen fecha_agotado en BD con más de 30 días (alineado a Laravel).
 * @param {Array<object>} products
 * @param {Record<string, string|null|undefined>} metaMap id → 'Y-m-d' | null
 */
export function filterProductsByFechaAgotadoMeta(products, metaMap) {
  if (!Array.isArray(products) || products.length === 0) {
    return products || [];
  }
  if (!metaMap || typeof metaMap !== 'object') {
    return products;
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 30);

  return products.filter((p) => {
    const id = String(p.id_articulo ?? p.id ?? '');
    const fecha = metaMap[id];
    if (fecha == null || fecha === '') {
      return true;
    }
    const day = String(fecha).slice(0, 10);
    const d = new Date(`${day}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
      return true;
    }
    d.setHours(0, 0, 0, 0);
    return d >= cutoff;
  });
}
