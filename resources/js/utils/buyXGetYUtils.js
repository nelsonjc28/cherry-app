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
 * Valida selección de pagadas + gratis antes de agregar al carrito.
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

  const paid = buy;
  const entitled = calculateEntitledFreeCount(paid, buy, get);

  return `Si pagas ${paid} pieza${paid > 1 ? 's' : ''}, elige ${entitled} gratis (total ${paid + entitled} en tu pedido).`;
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
