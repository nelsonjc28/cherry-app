/**
 * Vigencia de ofertas por día calendario (inicio y fin inclusive).
 */
export function isOfferActiveOnDate(startDate, endDate, on = new Date()) {
  const day = new Date(on);
  day.setHours(0, 0, 0, 0);

  if (startDate) {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      return false;
    }
    start.setHours(0, 0, 0, 0);
    if (day < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      return false;
    }
    end.setHours(23, 59, 59, 999);
    if (day > end) {
      return false;
    }
  }

  return true;
}

export function getOfferDaysRemaining(endDate, on = new Date()) {
  if (!endDate || !isOfferActiveOnDate(null, endDate, on)) {
    return null;
  }

  const day = new Date(on);
  day.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  return Math.max(0, Math.round((end - day) / (1000 * 60 * 60 * 24)));
}
