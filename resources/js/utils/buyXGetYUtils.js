/**
 * Buy X Get Y — modelo de lote global: el total de piezas (todas las tallas)
 * se reparte en pagadas + gratis; la gratis puede ser de otra talla.
 */

export function formatBuyXGetYOfferLabel(buyQuantity, getQuantity) {
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;

  if (buy <= 0 || get <= 0) {
    return '🎁 Oferta especial';
  }

  if (get === 1) {
    return `🎁 Compra ${buy} y lleva 1 gratis`;
  }

  return `🎁 Compra ${buy} y lleva ${get} gratis`;
}

/**
 * Cuántas prendas gratis corresponden según las piezas pagadas (global).
 */
export function calculateEntitledFreeCount(paidCount, buyQuantity, getQuantity) {
  const paid = parseInt(paidCount, 10) || 0;
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;

  if (buy <= 0 || get <= 0 || paid < buy) {
    return 0;
  }

  return Math.floor(paid / buy) * get;
}

/**
 * Reparte un total global en piezas pagadas y gratis (modelo lote).
 */
export function splitBuyXGetYGlobalTotal(totalQuantity, buyQuantity, getQuantity) {
  const total = parseInt(totalQuantity, 10) || 0;
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;

  if (buy <= 0 || get <= 0 || total <= 0) {
    return { paid: total, free: 0 };
  }

  const bundleSize = buy + get;
  const completeBundles = Math.floor(total / bundleSize);
  const remainder = total % bundleSize;
  const paid = completeBundles * buy + Math.min(remainder, buy);
  const free = completeBundles * get + Math.max(0, remainder - buy);

  return { paid, free };
}

/** @deprecated Usar splitBuyXGetYGlobalTotal — el reparto es global, no por talla. */
export function splitBuyXGetYTotalPerSize(totalQuantity, buyQuantity, getQuantity) {
  return splitBuyXGetYGlobalTotal(totalQuantity, buyQuantity, getQuantity);
}

/**
 * Asigna pagadas/gratis entre tallas: primero cubre pagadas en orden de selección,
 * el resto del total global va como gratis (puede ser otra talla).
 *
 * @param {Array<{ talla: string, cantidad: number }>} sizeSelections
 */
export function allocateBuyXGetYAcrossSizes(sizeSelections, buyQuantity, getQuantity) {
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;

  const selections = sizeSelections
    .map(({ talla, cantidad }) => ({
      talla,
      cantidad: parseInt(cantidad, 10) || 0,
    }))
    .filter(({ cantidad }) => cantidad > 0);

  const totalUnits = selections.reduce((sum, { cantidad }) => sum + cantidad, 0);
  const { paid: totalPaid, free: totalFree } = splitBuyXGetYGlobalTotal(totalUnits, buy, get);
  const entitled = calculateEntitledFreeCount(totalPaid, buy, get);

  if (entitled > 0 && totalFree < entitled) {
    const faltan = entitled - totalFree;
    const totalEsperado = totalPaid + entitled;
    const gratisLabel = entitled === 1 ? '1 gratis' : `${entitled} gratis`;
    const faltanLabel = faltan === 1 ? '1 prenda' : `${faltan} prendas`;

    return {
      valid: false,
      entitledFree: entitled,
      totalPaid,
      totalFree,
      totalUnits,
      splits: [],
      message: `Compra ${buy} y lleva ${get} gratis: agrega ${faltanLabel} más para completar la promoción (${totalEsperado} en total: ${totalPaid} pagadas y ${gratisLabel}). La gratis puede ser de otra talla.`,
    };
  }

  let paidRemaining = totalPaid;
  let freeRemaining = totalFree;
  const splits = [];

  for (const { talla, cantidad } of selections) {
    const paidOnSize = Math.min(cantidad, paidRemaining);
    paidRemaining -= paidOnSize;

    const leftoverOnSize = cantidad - paidOnSize;
    const freeOnSize = Math.min(leftoverOnSize, freeRemaining);
    freeRemaining -= freeOnSize;

    if (paidOnSize > 0 || freeOnSize > 0) {
      splits.push({
        talla,
        cantidad,
        paid: paidOnSize,
        free: freeOnSize,
      });
    }
  }

  return {
    valid: true,
    entitledFree: entitled,
    totalPaid,
    totalFree,
    totalUnits,
    splits,
    message: '',
  };
}

/**
 * Valida y reparte un contador por talla sumando el total global.
 */
export function validateBuyXGetYCartSelection(sizeSelections, buyQuantity, getQuantity) {
  return allocateBuyXGetYAcrossSizes(sizeSelections, buyQuantity, getQuantity);
}

/**
 * @deprecated Usar validateBuyXGetYCartSelection con reparto global entre tallas.
 */
export function validateBuyXGetYSelection(paidCount, freeCount, buyQuantity, getQuantity) {
  const paid = parseInt(paidCount, 10) || 0;
  const free = parseInt(freeCount, 10) || 0;
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;
  const entitled = calculateEntitledFreeCount(paid, buy, get);

  if (entitled === 0 && free > 0) {
    return {
      valid: false,
      entitledFree: 0,
      message: `Necesitas al menos ${buy} pieza${buy > 1 ? 's' : ''} pagada${buy > 1 ? 's' : ''} para obtener prendas gratis.`,
    };
  }

  if (entitled > 0 && free < entitled) {
    const faltan = entitled - free;
    return {
      valid: false,
      entitledFree: entitled,
      message: `Debes seleccionar ${entitled} prenda${entitled > 1 ? 's' : ''} gratis. Te faltan ${faltan}.`,
    };
  }

  if (free > entitled) {
    return {
      valid: false,
      entitledFree: entitled,
      message: `Solo corresponden ${entitled} prenda${entitled > 1 ? 's' : ''} gratis con tu selección pagada.`,
    };
  }

  return { valid: true, entitledFree: entitled, message: '' };
}

export function formatBuyXGetYOfferExample(buyQuantity, getQuantity) {
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;
  if (buy <= 0 || get <= 0) {
    return '';
  }

  const total = buy + get;

  return `Si agregas ${total} pieza${total > 1 ? 's' : ''} (en una o varias tallas), pagas ${buy} y llevas ${get} gratis.`;
}

/**
 * @deprecated Usar calculateEntitledFreeCount + líneas isFreeItem en carrito.
 */
export function calculateBuyXGetYTotals(totalQuantity, buyQuantity, getQuantity) {
  const paid = parseInt(totalQuantity, 10) || 0;
  const entitled = calculateEntitledFreeCount(paid, buyQuantity, getQuantity);

  return {
    paidItems: paid,
    freeItems: entitled,
    completeGroups: Math.floor(paid / (parseInt(buyQuantity, 10) || 1)),
  };
}
