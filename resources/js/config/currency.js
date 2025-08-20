/**
 * Configuración de moneda para la aplicación
 */

// Configuración de moneda por defecto
export const CURRENCY_CONFIG = {
  // Código ISO de la moneda
  code: 'MXN',
  
  // Símbolo de la moneda
  symbol: '$',
  
  // Nombre de la moneda
  name: 'Peso Mexicano',
  
  // Locale para formateo
  locale: 'es-MX',
  
  // Configuración de formateo
  formatting: {
    style: 'currency',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
};

// Función para obtener la configuración de moneda
export const getCurrencyConfig = () => CURRENCY_CONFIG;

// Función para obtener el símbolo de la moneda
export const getCurrencySymbol = () => CURRENCY_CONFIG.symbol;

// Función para obtener el código de la moneda
export const getCurrencyCode = () => CURRENCY_CONFIG.code;

// Función para obtener el locale de la moneda
export const getCurrencyLocale = () => CURRENCY_CONFIG.locale;

// Función para obtener la configuración de formateo
export const getCurrencyFormatting = () => CURRENCY_CONFIG.formatting;
