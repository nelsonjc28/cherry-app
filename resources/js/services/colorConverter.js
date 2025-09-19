class ColorConverter {
  constructor() {
    // Mapa de colores básicos en español
    this.colorMap = new Map([
      // Colores básicos
      ['rojo', '#FF0000'],
      ['azul', '#0000FF'],
      ['verde', '#00FF00'],
      ['amarillo', '#FFFF00'],
      ['negro', '#000000'],
      ['blanco', '#FFFFFF'],
      ['gris', '#808080'],
      ['rosa', '#FFC0CB'],
      ['morado', '#800080'],
      ['naranja', '#FFA500'],
      ['café', '#8B4513'],
      ['beige', '#F5F5DC'],
      ['turquesa', '#40E0D0'],
      ['violeta', '#EE82EE'],
      ['marrón', '#A52A2A'],
      ['celeste', '#87CEEB'],
      ['dorado', '#FFD700'],
      ['plateado', '#C0C0C0'],
      ['coral', '#FF7F50'],
      ['lila', '#C8A2C8'],
      ['fucsia', '#FF00FF'],
      ['fiusha', '#FF00FF'],
      ['mango', '#FDBE02'],
      ['limon', '#BFFF00'],
      ['mostaza', '#FFDB58'],
      ['camel', '#C19A6B'],
      ['vino', '#722F37'],
      ['arena', '#C2B280'],
      ['cielo', '#87CEEB'],
      ['hueso', '#FDF5E6'],
      ['manzana', '#8DB600'],
      ['militar', '#4B5320'],
      ['olivo', '#808000'],
      ['tangerina', '#F28500'],
      ['plumbago', '#593F47'],
      ['shedron', '#D94F00'],
      ['topo', '#8A897C'],
      ['aqua', '#00FFFF'],
      ['cereza', '#DE3163'],
      ['cobre', '#B87333'],
      ['crema', '#FFFDD0'],
      ['durazno', '#FFDAB9'],
      ['ivory', '#FFFFF0'],
      ['jade', '#00A86B'],
      ['kaqui', '#C3B091'],
      ['kaky', '#C3B091'],
      ['menta', '#98FB98'],
      ['miel', '#FFB347'],
      ['multicolor', '#FF6347'],
      ['oro', '#FFD700'],
      ['perla', '#EAE0C8'],
      ['plata', '#C0C0C0'],
      ['salmon', '#FA8072'],
      ['teal', '#008080'],
      ['tomate', '#FF6347'],
      ['uva', '#722F37'],
      ['berenjena', '#990066'],
      ['bugambilia', '#D648D6'],
      ['cacao', '#6B5848'],
      ['cafe', '#6F4E37'],
      ['cocoa', '#875F42'],
      ['gris perla', '#C0C0C0'],
      ['ladrillo', '#B22222'],
      ['maquillaje', '#F1C6B6'],
      ['moka', '#837060'],
      ['ocre', '#CC7722'],
      ['oxford', '#002147'],
      ['palo de rosa', '#E3AAAA'],
      ['petroleo', '#003F3F'],
      ['rey', '#4F4C4C'],
      ['tabaco', '#8B5A2B'],
      
      // Variaciones de colores
      ['rojo oscuro', '#8B0000'],
      ['azul oscuro', '#00008B'],
      ['verde oscuro', '#006400'],
      ['amarillo oscuro', '#B8860B'],
      ['rojo claro', '#FF6B6B'],
      ['azul claro', '#87CEEB'],
      ['verde claro', '#90EE90'],
      ['amarillo claro', '#FFFFE0'],
      
      // Colores de moda
      ['navy', '#000080'],
      ['marino', '#000080'],
      ['azul marino', '#000080'],
      ['burgundy', '#800020'],
      ['olive', '#808000'],
      ['teal', '#008080'],
      ['coral', '#FF7F50'],
      ['salmon', '#FA8072'],
      ['lavender', '#E6E6FA'],
      ['mint', '#98FF98'],
      ['peach', '#FFDAB9'],
      ['cream', '#FFFDD0'],
      ['tan', '#D2B48C'],
      ['khaki', '#8B4513'],
      ['kaqui', '#8B4513'],
      ['caqui', '#8B4513'],
      ['indigo', '#4B0082'],
      ['plum', '#DDA0DD'],
      ['sienna', '#A0522D'],
      ['peru', '#CD853F'],
      ['chocolate', '#D2691E'],
      ['saddlebrown', '#8B4513'],
      ['darkgreen', '#006400'],
      ['darkblue', '#00008B'],
      ['darkred', '#8B0000'],
      ['darkorange', '#FF8C00'],
      ['darkviolet', '#9400D3'],
      ['darkmagenta', '#8B008B'],
      ['darkcyan', '#008B8B'],
      ['lightblue', '#ADD8E6'],
      ['lightgreen', '#90EE90'],
      ['lightcoral', '#F08080'],
      ['lightpink', '#FFB6C1'],
      ['lightsalmon', '#FFA07A'],
      ['lightseagreen', '#20B2AA'],
      ['lightskyblue', '#87CEFA'],
      ['lightsteelblue', '#B0C4DE'],
      ['lightyellow', '#FFFFE0'],
      ['lightgoldenrodyellow', '#FAFAD2'],
      ['lightgray', '#D3D3D3'],
      ['lightgrey', '#D3D3D3'],
      ['lightcyan', '#E0FFFF'],
      ['lightseagreen', '#20B2AA'],
      ['lightslategray', '#778899'],
      ['lightslategrey', '#778899'],
      ['lightsteelblue', '#B0C4DE'],
      ['lightyellow', '#FFFFE0'],
      ['lime', '#00FF00'],
      ['limegreen', '#32CD32'],
      ['linen', '#FAF0E6'],
      ['magenta', '#FF00FF'],
      ['maroon', '#800000'],
      ['mediumaquamarine', '#66CDAA'],
      ['mediumblue', '#0000CD'],
      ['mediumorchid', '#BA55D3'],
      ['mediumpurple', '#9370DB'],
      ['mediumseagreen', '#3CB371'],
      ['mediumslateblue', '#7B68EE'],
      ['mediumspringgreen', '#00FA9A'],
      ['mediumturquoise', '#48D1CC'],
      ['mediumvioletred', '#C71585'],
      ['midnightblue', '#191970'],
      ['mintcream', '#F5FFFA'],
      ['mistyrose', '#FFE4E1'],
      ['moccasin', '#FFE4B5'],
      ['navajowhite', '#FFDEAD'],
      ['oldlace', '#FDF5E6'],
      ['olivedrab', '#6B8E23'],
      ['orangered', '#FF4500'],
      ['orchid', '#DA70D6'],
      ['palegoldenrod', '#EEE8AA'],
      ['palegreen', '#98FB98'],
      ['paleturquoise', '#AFEEEE'],
      ['palevioletred', '#DB7093'],
      ['papayawhip', '#FFEFD5'],
      ['peachpuff', '#FFDAB9'],
      ['powderblue', '#B0E0E6'],
      ['rosybrown', '#BC8F8F'],
      ['royalblue', '#4169E1'],
      ['sandybrown', '#F4A460'],
      ['seagreen', '#2E8B57'],
      ['seashell', '#FFF5EE'],
      ['slateblue', '#6A5ACD'],
      ['slategray', '#708090'],
      ['slategrey', '#708090'],
      ['snow', '#FFFAFA'],
      ['springgreen', '#00FF7F'],
      ['steelblue', '#4682B4'],
      ['thistle', '#D8BFD8'],
      ['tomato', '#FF6347'],
      ['wheat', '#F5DEB3'],
      ['whitesmoke', '#F5F5F5'],
      ['yellowgreen', '#9ACD32'],
      
      // Colores adicionales para evitar confusión
      ['cafe', '#8B4513'],
      ['café', '#8B4513'],
      ['marron', '#8B4513'],
      ['marrón', '#8B4513'],
      ['brown', '#8B4513'],
      ['red', '#FF0000'],
      ['blue', '#0000FF'],
      ['green', '#00FF00'],
      ['yellow', '#FFFF00'],
      ['black', '#000000'],
      ['white', '#FFFFFF'],
      ['gray', '#808080'],
      ['grey', '#808080'],
      ['pink', '#FFC0CB'],
      ['purple', '#800080'],
      ['violet', '#EE82EE'],
      ['orange', '#FFA500']
    ]);
  }

  // Convertir nombre de color a código hex
  getColorHex(colorName) {
    if (!colorName) return '#CCCCCC'; // Color gris por defecto
    
    // Normalizar el nombre del color
    const normalizedName = colorName.toLowerCase().trim();
    
    // Debug: mostrar qué color se está buscando

    
    // 1. Búsqueda exacta en el mapa
    const exactMatch = this.colorMap.get(normalizedName);
    if (exactMatch) {

      return exactMatch;
    }
    
    // 2. Búsqueda por palabras clave (más precisa)
    const keywordMatch = this.findByKeywords(normalizedName);
    if (keywordMatch) {

      return keywordMatch;
    }
    
    // 3. Búsqueda por similitud (fallback)
    const similarityMatch = this.findBySimilarity(normalizedName);
    if (similarityMatch) {

      return similarityMatch;
    }
    
    // 4. Si no se encuentra, generar color único
    const generatedColor = this.generateColorFromName(normalizedName);

    return generatedColor;
  }

  // Buscar por palabras clave más específicas
  findByKeywords(colorName) {
    // Mapeo de palabras clave a colores
    const keywordMap = {
      'cafe': '#8B4513',
      'café': '#8B4513',
      'marron': '#8B4513',
      'marrón': '#8B4513',
      'brown': '#8B4513',
      'rojo': '#FF0000',
      'red': '#FF0000',
      'azul': '#0000FF',
      'blue': '#0000FF',
      'verde': '#00FF00',
      'green': '#00FF00',
      'amarillo': '#FFFF00',
      'yellow': '#FFFF00',
      'negro': '#000000',
      'black': '#000000',
      'blanco': '#FFFFFF',
      'white': '#FFFFFF',
      'gris': '#808080',
      'gray': '#808080',
      'grey': '#808080',
      'rosa': '#FFC0CB',
      'pink': '#FFC0CB',
      'morado': '#800080',
      'purple': '#800080',
      'violeta': '#EE82EE',
      'violet': '#EE82EE',
      'naranja': '#FFA500',
      'orange': '#FFA500',
      'beige': '#F5F5DC',
      'turquesa': '#40E0D0',
      'turquoise': '#40E0D0',
      'celeste': '#87CEEB',
      'skyblue': '#87CEEB',
      'dorado': '#FFD700',
      'gold': '#FFD700',
      'plateado': '#C0C0C0',
      'silver': '#C0C0C0',
      'coral': '#FF7F50',
      'lila': '#C8A2C8',
      'lilac': '#C8A2C8',
      'navy': '#000080',
      'marino': '#000080',
      'azul marino': '#000080',
      'burgundy': '#800020',
      'olive': '#808000',
      'teal': '#008080',
      'salmon': '#FA8072',
      'lavender': '#E6E6FA',
      'mint': '#98FF98',
      'peach': '#FFDAB9',
      'cream': '#FFFDD0',
      'tan': '#D2B48C',
      'khaki': '#8B4513',
      'kaqui': '#8B4513',
      'caqui': '#8B4513',
      'indigo': '#4B0082',
      'plum': '#DDA0DD',
      'sienna': '#A0522D',
      'peru': '#CD853F',
      'chocolate': '#D2691E'
    };
    
    // Buscar coincidencia exacta en palabras clave
    if (keywordMap[colorName]) {
      return keywordMap[colorName];
    }
    
    // Buscar por variaciones comunes
    for (const [keyword, hex] of Object.entries(keywordMap)) {
      if (colorName.includes(keyword) || keyword.includes(colorName)) {
        return hex;
      }
    }
    
    return null;
  }

  // Buscar por similitud en el mapa principal
  findBySimilarity(colorName) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [key, value] of this.colorMap) {
      // Calcular similitud
      const similarity = this.calculateSimilarity(colorName, key);
      if (similarity > bestScore && similarity > 0.6) {
        bestScore = similarity;
        bestMatch = value;
      }
    }
    
    return bestMatch;
  }

  // Calcular similitud entre dos strings
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Distancia de Levenshtein para calcular similitud
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Generar color basado en el hash del nombre
  generateColorFromName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convertir hash a RGB
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    
    // Asegurar que el color no sea muy claro o muy oscuro
    const adjustedR = Math.max(50, Math.min(200, r));
    const adjustedG = Math.max(50, Math.min(200, g));
    const adjustedB = Math.max(50, Math.min(200, b));
    
    return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
  }

  // Convertir hex a RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Verificar si un color es claro u oscuro
  isLightColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return true;
    
    // Fórmula para calcular luminosidad
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5;
  }
}

export default new ColorConverter();
