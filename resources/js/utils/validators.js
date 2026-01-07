/**
 * Validate an email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a password meets minimum requirements
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum length requirement (default: 8)
 * @returns {boolean} - Whether the password is valid
 */
export const isValidPassword = (password, minLength = 8) => {
  if (!password || password.length < minLength) {
    return false;
  }
  
  // Password must contain at least one number and one letter
  return /\d/.test(password) && /[a-zA-Z]/.test(password);
};

/**
 * Validate a phone number (exactly 10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const isValidPhone = (phone) => {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s()-]/g, '');
  
  // Check if it only contains digits and is exactly 10 digits
  return /^\d{10}$/.test(cleaned);
};

/**
 * Validate if a field has a value
 * @param {string} value - Value to check
 * @returns {boolean} - Whether the field has a value
 */
export const hasValue = (value) => {
  return value !== undefined && value !== null && value.trim() !== '';
};

/**
 * Check if a number is within a range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} - Whether the number is within the range
 */
export const isInRange = (value, min, max) => {
  const numValue = Number(value);
  return !isNaN(numValue) && numValue >= min && numValue <= max;
};

/**
 * Validate postal/zip code
 * @param {string} code - Postal code to validate
 * @param {string} countryCode - ISO country code (default: MX for Mexico)
 * @returns {boolean} - Whether the postal code is valid for the country
 */
export const isValidPostalCode = (code, countryCode = 'MX') => {
  const postalRegexMap = {
    'MX': /^\d{5}$/, // Mexico: 5 digits
    'US': /^\d{5}(-\d{4})?$/, // USA: 5 digits or 5+4 format
    'CA': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/ // Canada: e.g. K1A 0B1
  };
  
  const regex = postalRegexMap[countryCode.toUpperCase()] || /^\d{5,10}$/; // Default
  return regex.test(code);
}; 
