/**
 * Reglas globales de disponibilidad delegadas al evaluador central.
 * Mantener este archivo sólo para compatibilidad: la lógica vive en
 * {@see ./productStatusEvaluator.js} y debe estar sincronizada con
 * {@see App\Support\ProductStatusEvaluator} (PHP).
 */

export {
  hasActiveSale,
  evaluateProductStatus,
  getProductCardStockStatus,
  getProductInventoryStatusKind,
  getProductStatus,
  filterProducts,
  matchesFilter,
  isNewArrival,
  STATUS,
  FILTER,
} from './productStatusEvaluator';

/**
 * Contribución de una talla al stock total: inventario_d negativo no resta.
 * (alineado con Producto::effectiveDetailInventoryContribution en PHP).
 */
export function effectiveDetailInventoryContribution(raw) {
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0) {
    return 0;
  }
  return n;
}

/**
 * Inventario total: si hay detalles/tallas con `inventario_d`, usa la suma;
 * si los detalles existen pero NO traen `inventario_d`, cae al inventario
 * de cabecera (`inventario` o `stock`).
 *
 * Si los detalles tienen `inventario_d` y la suma es 0 pero la cabecera
 * reporta stock > 0, gana el valor mayor. Esto protege contra dos casos:
 *   1. Endpoints que no incluyen `inventario_d` (defensa).
 *   2. Sync incompleta del detalle (header actualizado, detalles aún en 0):
 *      no se debe ocultar el producto de los listados por un desfase
 *      transitorio.
 */
export function getTotalInventoryFromProduct(product) {
  if (!product) {
    return 0;
  }
  const detalles = product.detalles;
  const headerInv = effectiveDetailInventoryContribution(
    product.inventario ?? product.stock ?? 0
  );

  if (detalles && Array.isArray(detalles) && detalles.length > 0) {
    let hasInventarioD = false;
    let sum = 0;
    for (const d of detalles) {
      const inv = d?.inventario_d;
      if (inv !== undefined && inv !== null && inv !== '' && !Number.isNaN(Number(inv))) {
        hasInventarioD = true;
      }
      const positive = effectiveDetailInventoryContribution(inv);
      sum += positive;
    }
    // Si los detalles tienen campo `inventario_d`, son la fuente de verdad
    // (aunque sumen 0 el producto está agotado).
    if (hasInventarioD) {
      return sum;
    }
    // Detalles sin `inventario_d` (campo ausente): caer a la cabecera.
    return headerInv;
  }

  return headerInv;
}

/**
 * Stock "para badge de hay piezas" (>= 0).
 * @deprecated Preferir getTotalInventoryFromProduct donde haga falta el número exacto.
 */
export function computeTotalProductStock(product) {
  return Math.max(0, getTotalInventoryFromProduct(product));
}

/**
 * Oculta en catálogo externo los que tienen fecha_agotado en BD con más de 30 días (alineado a Laravel).
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
