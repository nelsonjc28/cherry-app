/**
 * Reglas globales de disponibilidad / badges (Home, búsqueda, categorías, fichas).
 * Un producto con oferta activa (desc_promo) nunca se muestra como "Próximamente".
 */

export function hasActiveDescPromo(product) {
  if (!product) return false;
  const raw = product.desc_promo ?? product.descPromo;
  if (raw === null || raw === undefined || raw === '') return false;
  const n = Number(raw);
  return !Number.isNaN(n) && n > 0;
}

export function computeTotalProductStock(product) {
  if (!product) return 0;
  if (product.detalles?.length > 0) {
    const sum = product.detalles.reduce(
      (total, detalle) => total + (parseFloat(detalle.inventario_d) || 0),
      0
    );
    if (sum > 0.00001) return sum;
  }
  return parseFloat(product.stock ?? product.inventario ?? 0) || 0;
}

/**
 * Estado para badges en tarjetas: 'coming-soon' | 'out-of-stock' | null (hay stock).
 */
export function getProductCardStockStatus(product) {
  const totalStock = computeTotalProductStock(product);
  const stockReceivedCountValue = parseInt(
    product.stock_received_count ?? product.stockReceivedCount ?? 0,
    10
  );

  if (stockReceivedCountValue > 0 && totalStock <= 0.00001) {
    return 'out-of-stock';
  }
  if (totalStock > 0.00001) {
    return null;
  }
  if (hasActiveDescPromo(product)) {
    return 'out-of-stock';
  }

  const productId = String(product.id ?? product.id_articulo ?? '');
  if (productId.length < 3) {
    return 'out-of-stock';
  }
  const tercerDigito = productId[2];
  const currentYearLastDigit = String(new Date().getFullYear() % 10);
  const isComingSoonYear = tercerDigito === currentYearLastDigit;

  if (isComingSoonYear && totalStock <= 0.00001 && stockReceivedCountValue === 0) {
    return 'coming-soon';
  }
  return 'out-of-stock';
}
