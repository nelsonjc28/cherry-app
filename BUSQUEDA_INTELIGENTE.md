# 🔍 Sistema de Búsqueda Inteligente con Soporte para Plurales/Singulares

## 📋 Descripción

El sistema de búsqueda de Cherry App ahora incluye soporte inteligente para plurales y singulares en español, permitiendo encontrar productos sin importar si el usuario busca en singular o plural.

## ✨ Características

### 1. **Normalización de Texto**
- Elimina acentos automáticamente
- Convierte a minúsculas
- Limpia caracteres especiales

### 2. **Conversión Automática**
- **Singular → Plural**
  - blusa → blusas
  - pantalon → pantalones
  - zapato → zapatos
  - feliz → felices
  
- **Plural → Singular**
  - blusas → blusa
  - pantalones → pantalon
  - zapatos → zapato
  - felices → feliz

### 3. **Búsqueda Flexible**
- Busca automáticamente en todas las variaciones
- No requiere que el usuario escriba exactamente como está en el sistema
- Soporta búsquedas con múltiples palabras

## 📝 Ejemplos de Uso

### Ejemplo 1: Búsqueda en Singular/Plural

**Búsqueda:** `blusa`
**Encuentra:**
- "Blusa de manga larga"
- "Blusas con encaje"
- "BLUSA casual"

**Búsqueda:** `blusas`
**Encuentra:**
- "Blusa de manga larga"
- "Blusas con encaje"
- "BLUSA casual"

### Ejemplo 2: Búsqueda con Acentos

**Búsqueda:** `pantalon`
**Encuentra:**
- "Pantalón de mezclilla"
- "Pantalones deportivos"
- "PANTALON casual"

**Búsqueda:** `pantalón`
**Encuentra:** (Los mismos resultados que arriba)

### Ejemplo 3: Múltiples Palabras

**Búsqueda:** `blusa negra`
**Encuentra:**
- "Blusa negra elegante"
- "Blusas negras casuales"
- "Blusa de color negro"

## 🛠️ Implementación Técnica

### Archivos Modificados

1. **`resources/js/utils/searchNormalizer.js`** (NUEVO)
   - Utilidad principal para normalización y búsqueda flexible
   - Funciones: `normalizeText`, `toSingular`, `toPlural`, `flexibleMatch`, etc.

2. **`resources/js/pages/BuscarPage.jsx`**
   - Actualizado para usar `flexibleSearchInFields`
   - Busca en: descripción, título, código, description

3. **`resources/js/api/cherryApi.js`**
   - Función `searchProductsAdvanced` actualizada
   - Usa `flexibleMatch` para búsqueda en múltiples campos
   - Mantiene búsqueda exacta en códigos (ID, SKU, EAN)

4. **`resources/js/utils/productCacheInMemory.js`**
   - Función `filterBySearch` actualizada
   - Búsqueda flexible en descripción y línea
   - Búsqueda exacta en códigos

### Reglas de Pluralización en Español

```javascript
// Singular → Plural
- Termina en vocal → añade "s"
  zapato → zapatos
  blusa → blusas

- Termina en consonante → añade "es"
  pantalon → pantalones
  cinturon → cinturones

- Termina en "z" → cambia a "ces"
  feliz → felices
  luz → luces

// Plural → Singular
- Termina en "ces" → cambia a "z"
  felices → feliz
  luces → luz

- Termina en "es" → elimina "es"
  pantalones → pantalon
  cinturones → cinturon

- Termina en "s" (vocal + s) → elimina "s"
  zapatos → zapato
  blusas → blusa
```

## 🎯 Campos de Búsqueda

### Con Búsqueda Flexible (Plurales/Singulares)
- Descripción del producto
- Marca
- Línea/Categoría
- Sector
- Género
- Especificaciones
- Notas
- Colores

### Con Búsqueda Exacta (Sin Plurales)
- ID del artículo
- SKU
- EAN
- DTU
- Códigos de barras
- Tallas

## 🚀 Ventajas

1. **Mejor Experiencia de Usuario**
   - No necesita adivinar si está en singular o plural
   - Resultados más relevantes

2. **Mayor Flexibilidad**
   - Busca con o sin acentos
   - No distingue mayúsculas/minúsculas

3. **Búsqueda Inteligente**
   - Genera automáticamente variaciones
   - Encuentra más productos relevantes

## 📊 Rendimiento

- ✅ **Rápido**: La normalización es instantánea
- ✅ **Eficiente**: Solo procesa variaciones necesarias
- ✅ **Escalable**: Funciona con miles de productos

## 🔮 Futuras Mejoras Posibles

1. **Sinónimos**: "pantalón" = "pantalones" = "pants"
2. **Corrección ortográfica**: "pantaloon" → "pantalon"
3. **Búsqueda por categorías**: detectar automáticamente tipos de ropa
4. **Búsqueda semántica**: "ropa de invierno" → chamarra, suéter, etc.

## 📌 Notas Importantes

- Los códigos (SKU, EAN, ID) mantienen búsqueda exacta para precisión
- El sistema prioriza resultados donde todas las palabras coinciden
- La búsqueda es case-insensitive y accent-insensitive
- Las variaciones se generan automáticamente en tiempo real

---

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Autor:** Cherry App Team

