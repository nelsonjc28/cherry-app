/**
 * Utility functions for handling asset paths in development and production
 * This ensures consistent asset loading regardless of deployment environment
 */

/**
 * Get the base URL for the application
 * @returns {string} The base URL
 */
export const getBaseUrl = () => {
  // Get base URL from Vite configuration or current location
  return import.meta.env.BASE_URL || '/';
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
 * Get the path for an icon from the public/icons directory
 * @param {string} iconName - Name of the icon file (with or without extension)
 * @returns {string} - Full path to the icon
 */
export const getIconPath = (iconName) => {
  // Remove .svg extension if already present to avoid double extension
  const cleanIconName = iconName.replace(/\.svg$/i, '');
  // Use window.location.origin for full URL
  return `${window.location.origin}/icons/${cleanIconName}.svg`;
};

/**
 * Get the path for an image from the public/images directory
 * @param {string} imageName - Name of the image file (with extension)
 * @returns {string} - Full path to the image
 */
export const getImagePath = (imageName) => {
  // Use getAssetPath for consistent path resolution
  return getAssetPath(`images/${imageName}`);
};

/**
 * Get the path for a category icon
 * @param {string} categoryName - Name of the category (with or without extension)
 * @returns {string} - Full path to the category icon
 */
export const getCategoryIconPath = (categoryName) => {
  // Remove .svg or .png extension if already present to avoid double extension
  const cleanIconName = categoryName.replace(/\.(svg|png)$/i, '');
  
  // Mapeo de nombres de categorías a nombres de archivos PNG disponibles
  const categoryIconMap = {
    'vestidos': 'vestido.png',
    'blusas': 'Blusa.png',
    'pantalones': 'Pantalones.png',
    'sacos': 'vestir-1.png',
    'conjuntos': 'Conjuntos.png',
    'gabardinas': 'Gabardina.png',
    'vestido-de-novio': 'vestido-de-novio.png',
    'pantalones-ajustados': 'Pantalones.png',
    'blusa': 'Blusa.png',
    'gabardina': 'Gabardina.png',
    'moda': 'Conjuntos.png',
    'vestir': 'vestir-1.png',
    'trench-coat': 'trench coat _ Gabardina.png',
    'calzado': 'Calsado.png',
    'perfumeria': 'Perfumeria.png',
    'chamarra': 'Chamarra.png',
    'collar': 'Collar.png',
    'short': 'Short.png',
    'capa': 'Capa.png',
    'chaqueta-de-cuero': 'chaqueta-de-cuero.png',
    'top': 'Top.png',
    'chaleco': 'Chaleco.png',
    'bufanda': 'Bufanda.png',
    'abrigo': 'Abrigo.png',
    'bolsa': 'Bolsa.png',
    'sueter': 'Sueter.png',
    'pijama': 'Pijama.png',
    'falda': 'Falda.png',
    'romper': 'Romper.png',
    'sudadera': 'Sudadera.png',
    'jumpsuit': 'Jumpsuit.png',
    'sin-linea': 'Sin linea.png',
    'vestido': 'vestido.png'
  };
  
  const normalizedName = cleanIconName.toLowerCase().replace(/\s+/g, '-');
  
  // Si tenemos un mapeo específico, usarlo
  if (categoryIconMap[normalizedName]) {
    return `${window.location.origin}/icons/category/${categoryIconMap[normalizedName]}`;
  }
  
  // Fallback: intentar con el nombre normalizado como PNG
  return `${window.location.origin}/icons/category/${normalizedName}.png`;
};

/**
 * Get the path for a featured category icon
 * @param {string} categoryName - Name of the featured category
 * @returns {string} - Full path to the featured category icon
 */
export const getFeaturedCategoryIconPath = (categoryName) => {
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return `${window.location.origin}/icons/featuredCategories/${normalizedName}.png`;
};

/**
 * Get the path for a hero icon
 * @param {string} iconName - Name of the hero icon
 * @returns {string} - Full path to the hero icon
 */
export const getHeroIconPath = (iconName) => {
  return `${window.location.origin}/icons/hero/${iconName}`;
};

/**
 * Get the path for a hero slider image
 * @param {string} imageName - Name of the hero slider image
 * @returns {string} - Full path to the hero slider image
 */
export const getHeroSliderImagePath = (imageName) => {
  return getAssetPath(`images/HeroBanner/${imageName}`);
};

/**
 * Get the path for a featured catalog image
 * @param {string} imageName - Name of the featured catalog image
 * @returns {string} - Full path to the featured catalog image
 */
export const getFeaturedCatalogImagePath = (imageName) => {
  return getAssetPath(`images/RecentCatalogs/${imageName}`);
};

/**
 * Get the path for a product image
 * @param {string} imageName - Name of the product image
 * @returns {string} - Full path to the product image
 */
export const getProductImagePath = (imageName) => {
  return getAssetPath(`images/catalogProductImages/${imageName}`);
};

/**
 * Get the path for a featured product image
 * @param {string} imageName - Name of the featured product image
 * @returns {string} - Full path to the featured product image
 */
export const getFeaturedProductImagePath = (imageName) => {
  return getAssetPath(`images/FeaturedProducts/${imageName}`);
};

/**
 * Get the path for a hero banner image
 * @param {string} imageName - Name of the hero banner image
 * @returns {string} - Full path to the hero banner image
 */
export const getHeroBannerImagePath = (imageName) => {
  return getAssetPath(`images/HeroBanner/${imageName}`);
};

/**
 * Get the path for a recent catalog image
 * @param {string} imageName - Name of the recent catalog image
 * @returns {string} - Full path to the recent catalog image
 */
export const getRecentCatalogImagePath = (imageName) => {
  return getAssetPath(`images/RecentCatalogs/${imageName}`);
};

/**
 * Get the path for an affiliate section image
 * @param {string} imageName - Name of the affiliate section image
 * @returns {string} - Full path to the affiliate section image
 */
export const getAffiliateImagePath = (imageName) => {
  return getAssetPath(`images/AffiliateSection/${imageName}`);
};

/**
 * Get the path for the logo
 * @returns {string} - Full path to the logo
 */
export const getLogoPath = () => {
  return getAssetPath('images/logo.svg');
};

/**
 * Get the path for a placeholder image
 * @returns {string} - Full path to the placeholder image
 */
export const getPlaceholderImagePath = () => {
  return getAssetPath('images/placeholder.jpg');
};

/**
 * Check if an image exists at the given path
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} - Whether the image exists
 */
export const imageExists = async (path) => {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get a fallback image path if the primary image doesn't exist
 * @param {string} primaryPath - Primary image path
 * @param {string} fallbackPath - Fallback image path
 * @returns {Promise<string>} - Path to use (primary or fallback)
 */
export const getImageWithFallback = async (primaryPath, fallbackPath) => {
  const exists = await imageExists(primaryPath);
  return exists ? primaryPath : fallbackPath;
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

/**
 * Debug function to test asset paths
 * @param {string} assetType - Type of asset (icon, image, etc.)
 * @param {string} assetName - Name of the asset
 * @returns {object} Debug information about the asset path
 */
export const debugAssetPath = (assetType, assetName) => {
  const baseUrl = getBaseUrl();
  const assetPath = assetType === 'icon' ? getIconPath(assetName) : getImagePath(assetName);
  
  return {
    assetType,
    assetName,
    baseUrl,
    assetPath,
    fullUrl: assetPath,
    exists: null // Will be populated by checkAssetExists
  };
}; 