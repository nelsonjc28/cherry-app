/**
 * Buy X Get Y — modelo de lote: pagas X piezas y llevas Y gratis (dentro del paquete X+Y).
 * El cliente elige explícitamente piezas pagadas y piezas gratis (talla/color).
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
 * Cuántas prendas gratis corresponden según las piezas pagadas seleccionadas.
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
 * Reparte un total por talla en piezas pagadas y gratis (modelo lote).
 */
export function splitBuyXGetYTotalPerSize(totalQuantity, buyQuantity, getQuantity) {
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

/**
 * Valida un solo contador por talla (total = pagadas + gratis en la selección).
 */
export function validateBuyXGetYCartSelection(sizeSelections, buyQuantity, getQuantity) {
  const buy = parseInt(buyQuantity, 10) || 0;
  const get = parseInt(getQuantity, 10) || 0;

  let totalPaid = 0;
  let totalFree = 0;
  const splits = [];

  for (const { talla, cantidad } of sizeSelections) {
    const { paid, free } = splitBuyXGetYTotalPerSize(cantidad, buy, get);
    totalPaid += paid;
    totalFree += free;
    if (paid > 0 || free > 0) {
      splits.push({ talla, cantidad, paid, free });
    }
  }

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
      splits,
      message: `Compra ${buy} y lleva ${get} gratis: agrega ${faltanLabel} más para completar la promoción (${totalEsperado} en total: ${totalPaid} pagadas y ${gratisLabel}).`,
    };
  }

  return { valid: true, entitledFree: entitled, totalPaid, totalFree, splits, message: '' };
}

/**
 * @deprecated Usar validateBuyXGetYCartSelection con un contador por talla.
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

  return `Si agregas ${total} pieza${total > 1 ? 's' : ''}, pagas ${buy} y llevas ${get} gratis.`;
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
