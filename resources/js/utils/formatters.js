import { getCurrencyCode, getCurrencyLocale, getCurrencyFormatting } from '../config/currency';

/**
 * Format a price number to a currency string
 * @param {number} price - Price to format
 * @param {string} currencyCode - ISO currency code (default: MXN)
 * @param {string} locale - Locale for formatting (default: es-MX)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price, currencyCode = getCurrencyCode(), locale = getCurrencyLocale()) => {
  const formatting = getCurrencyFormatting();
  return new Intl.NumberFormat(locale, {
    ...formatting,
    currency: currencyCode
  }).format(price);
};

/**
 * Format a date string to a localized format
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale for formatting (default: es-MX)
 * @param {object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, locale = 'es-MX', options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Truncate text to a specific length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + '...';
};

/**
 * Generate URL-friendly slug from a string
 * @param {string} text - Text to convert to slug
 * @returns {string} - URL-friendly slug
 */
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single one
    .trim();
};

/**
 * Calculate discount price
 * @param {number} originalPrice - Original price
 * @param {number} discountPercentage - Discount percentage (e.g., 20 for 20%)
 * @returns {number} - Price after discount
 */
export const calculateDiscountPrice = (originalPrice, discountPercentage) => {
  const discount = (originalPrice * discountPercentage) / 100;
  return originalPrice - discount;
}; 