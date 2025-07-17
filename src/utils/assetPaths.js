/**
 * Utility functions for handling asset paths in development and production
 * This ensures consistent asset loading regardless of deployment environment
 */

/**
 * Get the base URL for the application
 * @returns {string} The base URL
 */
export const getBaseUrl = () => {
  // Use window.location.origin to get the complete base URL
  return window.location.origin;
};

/**
 * Resolve asset path for public folder assets
 * @param {string} path - Path to asset starting from public folder
 * @returns {string} Complete asset URL
 */
export const getAssetPath = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = getBaseUrl();
  
  // Ensure base URL ends with slash
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  return `${normalizedBase}${cleanPath}`;
};

/**
 * Resolve image path from public/images directory
 * @param {string} imageName - Image filename
 * @returns {string} Complete image URL
 */
export const getImagePath = (imageName) => {
  return getAssetPath(`images/${imageName}`);
};

/**
 * Resolve icon path from public/icons directory
 * @param {string} iconName - Icon filename
 * @returns {string} Complete icon URL
 */
export const getIconPath = (iconName) => {
  return getAssetPath(`icons/${iconName}`);
};

/**
 * Resolve category icon path from public/icons/category directory
 * @param {string} iconName - Category icon filename
 * @returns {string} Complete category icon URL
 */
export const getCategoryIconPath = (iconName) => {
  return getAssetPath(`icons/category/${iconName}`);
};

/**
 * Resolve hero icon path from public/icons/hero directory
 * @param {string} iconName - Hero icon filename
 * @returns {string} Complete hero icon URL
 */
export const getHeroIconPath = (iconName) => {
  return getAssetPath(`icons/hero/${iconName}`);
};

/**
 * Resolve featured category icon path from public/icons/featuredCategories directory
 * @param {string} iconName - Featured category icon filename
 * @returns {string} Complete featured category icon URL
 */
export const getFeaturedCategoryIconPath = (iconName) => {
  return getAssetPath(`icons/featuredCategories/${iconName}`);
};

/**
 * Resolve hero slider image path from public/images/hero_slider directory
 * @param {string} imageName - Hero slider image filename
 * @returns {string} Complete hero slider image URL
 */
export const getHeroSliderImagePath = (imageName) => {
  return getAssetPath(`images/HeroBanner/${imageName}`);
};

/**
 * Resolve featured catalogs image path from public/images/destacados directory
 * @param {string} imageName - Featured catalog image filename
 * @returns {string} Complete featured catalog image URL
 */
export const getFeaturedCatalogImagePath = (imageName) => {
  return getAssetPath(`images/RecentCatalogs/${imageName}`);
};

/**
 * Preload an image to ensure it's cached
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves when image is loaded
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Check if an asset exists by attempting to fetch it
 * @param {string} assetPath - Path to the asset
 * @returns {Promise<boolean>} Promise that resolves to true if asset exists
 */
export const checkAssetExists = async (assetPath) => {
  try {
    const response = await fetch(assetPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get fallback image path for broken images
 * @returns {string} Path to fallback image
 */
export const getFallbackImagePath = () => {
  return getAssetPath('images/placeholder.svg');
};

/**
 * Environment-aware console logging for asset loading
 * @param {string} message - Log message
 * @param {string} level - Log level (log, warn, error)
 */
export const logAssetAction = (message, level = 'log') => {
  if (import.meta.env.DEV) {
    console[level](`[Asset Manager] ${message}`);
  }
}; 