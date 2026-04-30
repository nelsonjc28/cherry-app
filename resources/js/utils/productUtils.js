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
 * Inventario total como en el detalle del producto: suma de `detalles[].inventario_d` o cabecera.
 * (Mantiene signos: −1 + 0 = −1, alineado a ProductPage.)
 */
export function getTotalInventoryFromProduct(product) {
  if (!product) {
    return 0;
  }
  const detalles = product.detalles;
  if (detalles && detalles.length > 0) {
    return detalles.reduce((total, detalle) => {
      return total + (detalle.inventario_d || 0);
    }, 0);
  }
  return product.inventario || product.stock || 0;
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
