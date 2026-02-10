// Color identification service using coloridentifier.org API
class ColorService {
  constructor() {
    this.baseUrl = 'https://coloridentifier.org/api/v1/identify';
    this.colorCache = new Map(); // Cache para evitar llamadas repetidas
  }

  // Identificar un color por nombre
  async identifyColor(colorName) {
    if (!colorName) return null;

    // Verificar cache primero
    if (this.colorCache.has(colorName)) {
      return this.colorCache.get(colorName);
    }

    try {
      const response = await fetch(`${this.baseUrl}?name=${encodeURIComponent(colorName)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.hex) {
        const colorInfo = {
          name: colorName,
          hex: data.hex,
          rgb: data.rgb,
          hsl: data.hsl,
          confidence: data.confidence || 0
        };

        // Guardar en cache
        this.colorCache.set(colorName, colorInfo);
        return colorInfo;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Identificar múltiples colores en paralelo
  async identifyMultipleColors(colorNames) {
    if (!Array.isArray(colorNames) || colorNames.length === 0) {
      return [];
    }

    const promises = colorNames.map(colorName => this.identifyColor(colorName));
    const results = await Promise.allSettled(promises);

    return results
      .map((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          return result.value;
        }
        return null;
      })
      .filter(Boolean);
  }

  // Limpiar cache
  clearCache() {
    this.colorCache.clear();
  }

  // Obtener color del cache
  getCachedColor(colorName) {
    return this.colorCache.get(colorName);
  }

  // Verificar si un color está en cache
  isColorCached(colorName) {
    return this.colorCache.has(colorName);
  }
}

export default new ColorService();
