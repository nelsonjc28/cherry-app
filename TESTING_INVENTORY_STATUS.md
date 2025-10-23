# Guía de Prueba: Estados de Inventario

## 🎯 Implementación Completada

Se han implementado 3 estados de inventario en la página de producto:

1. **✅ En Stock** (Verde #1DA534) - Cuando hay inventario disponible
2. **❌ Agotado** (Rojo #D32F2F) - Cuando no hay inventario y el producto no es nuevo
3. **🕒 Próximamente** (Naranja #FF9800) - Para productos nuevos (< 30 días) sin inventario

---

## 📦 Productos Disponibles para Prueba

### 1. Estado "EN STOCK" ✅
Puedes usar cualquiera de estos productos que tienen inventario disponible:

- **ID: 515422524512** - Chamarra Lisa Con Cierre Al Frente (3 unidades)
  - URL: http://localhost/cherry-app/public/#/product/515422524512

- **ID: 40552080604** - Pantalon Tipo Jogger Con Resorte En Cintura (3 unidades)
  - URL: http://localhost/cherry-app/public/#/product/40552080604

- **ID: 9752157104** - Pantalon Liso De Vestir Con Bolsas (3 unidades)
  - URL: http://localhost/cherry-app/public/#/product/9752157104

### 2. Estado "AGOTADO" ❌
**Nota:** Actualmente NO hay productos sin stock en la base de datos.

Para probar este estado, puedes simular temporalmente:

**Opción A - Simulación en el código:**
1. Abre `resources/js/pages/ProductPage.jsx`
2. En la función `getTotalInventory()` (línea ~546)
3. Descomenta la línea: `return 0;`
4. Visita cualquier producto
5. Verás el estado "Agotado" en rojo

**Opción B - Usando la consola del navegador:**
```javascript
// En la página de producto, abre la consola y ejecuta:
window.testInventoryStatus = 'out-of-stock';
// Luego recarga la página
```

### 3. Estado "PRÓXIMAMENTE" 🕒
**Nota:** Actualmente NO hay productos nuevos sin stock.

Para probar este estado:

**Simulación en el código:**
1. Abre `resources/js/pages/ProductPage.jsx`
2. En la función `getTotalInventory()` (línea ~546)
3. Descomenta: `return 0;`
4. En la función `isNewProduct()` (línea ~564)
5. Cambia temporalmente: `return diffDays <= 30 && totalInventory === 0;` 
   por: `return true;`
6. Visita cualquier producto
7. Verás el estado "Próximamente" en naranja

---

## 🧪 Comandos para Buscar Productos

Para buscar productos con diferentes estados de inventario, ejecuta:

```bash
php find_no_stock_products.php
```

Este script te mostrará:
- Productos nuevos sin stock (Próximamente)
- Productos agotados (sin inventario)
- Productos con bajo inventario (En Stock)

---

## 🎨 Estilos CSS Implementados

Los estilos se encuentran en `resources/js/pages/ProductPage.css`:

```css
.product-page__stock-status--in-stock {
  color: #1DA534; /* Verde */
}

.product-page__stock-status--out-of-stock {
  color: #D32F2F; /* Rojo */
}

.product-page__stock-status--coming-soon {
  color: #FF9800; /* Naranja */
}
```

---

## 📝 Lógica Implementada

El sistema determina el estado basándose en:

1. **Próximamente**: 
   - Producto con `fecha_alta` menor a 30 días
   - Inventario total = 0

2. **En Stock**:
   - Inventario total > 0

3. **Agotado**:
   - Inventario total = 0
   - Producto NO es nuevo (más de 30 días desde alta)

---

## ✨ Archivos Modificados

1. `resources/js/pages/ProductPage.jsx` - Lógica de estados
2. `resources/js/pages/ProductPage.css` - Estilos para los 3 estados
3. `find_no_stock_products.php` - Script de búsqueda (creado)

---

## 🔧 Revertir Cambios de Prueba

Después de probar, recuerda:

1. Volver a comentar las líneas de testing en `getTotalInventory()`
2. Revertir cualquier cambio temporal en `isNewProduct()`
3. Los cambios permanentes (estilos CSS y lógica) pueden quedarse

---

## 📞 Notas Adicionales

- El inventario se calcula sumando todos los `inventario_d` de los detalles del producto
- Si no hay detalles, se usa el `inventario` o `stock` general del producto
- El ícono cambia junto con el color y texto según el estado

