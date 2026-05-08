import { getTotalInventoryFromProduct } from './productUtils';

/**
 * Igual que /nuevos: interpretar fecha_compra (Y-m-d desde API o d-m-Y legacy).
 */
export function parseFechaCompraForNewRule(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dmY = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (dmY) {
    const d = new Date(Number(dmY[3]), Number(dmY[2]) - 1, Number(dmY[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Regla global alineada con /nuevos:
 * - fecha_compra dentro de los últimos 30 días
 * - stock total > 0 (misma regla que getTotalInventoryFromProduct)
 */
export function isProductNewLikeNuevosPage(product) {
  if (!product) return false;
  const purchaseDate = parseFechaCompraForNewRule(product.fecha_compra ?? product.fechaCompra);
  if (!purchaseDate) return false;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (!(purchaseDate > thirtyDaysAgo)) return false;
  return getTotalInventoryFromProduct(product) > 0.00001;
}

/** Para ordenar por “fecha de compra” (timestamp o 0). */
export function sortKeyFechaCompra(product) {
  const d = parseFechaCompraForNewRule(product?.fechaCompra ?? product?.fecha_compra);
  return d ? d.getTime() : 0;
}
