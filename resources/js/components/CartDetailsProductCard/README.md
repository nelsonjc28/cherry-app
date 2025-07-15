# CartDetailsProductCard

Componente crítico para mostrar productos en el carrito de compras, con soporte para vistas mobile y desktop.

## Estructura

- **index.jsx**: Componente principal. Detecta el tamaño de pantalla usando el hook `useIsDesktop` y renderiza la vista correspondiente.
- **DesktopView.jsx**: Vista para escritorio.
- **MobileView.jsx**: Vista para móvil.
- **CartDetailsProductCard.css**: Estilos del componente.
- **index.js**: Punto de exportación para importaciones limpias.

## Props

| Prop              | Tipo                                      | Requerido | Descripción                                                        |
|-------------------|-------------------------------------------|-----------|--------------------------------------------------------------------|
| image             | string                                    | Sí        | URL de la imagen del producto                                      |
| sku               | string                                    | Sí        | SKU del producto                                                   |
| title             | string                                    | Sí        | Título o nombre del producto                                       |
| isDiscount        | bool                                      | No        | Indica si el producto tiene descuento                              |
| discountLabel     | string                                    | No        | Etiqueta de descuento                                              |
| price             | string \| number                          | Sí        | Precio unitario del producto                                       |
| variants          | array de objetos ({color, size, quantity}) | Sí        | Variantes del producto (color, talla, cantidad)                    |
| summary           | objeto                                    | Sí        | Resumen de cantidades y precios (ver ejemplo abajo)                |
| onRemove          | function                                  | Sí        | Handler para eliminar una variante                                 |
| onQuantityChange  | function                                  | Sí        | Handler para cambiar la cantidad de una variante                   |

### Ejemplo de `variants`
```js
variants: [
  { color: 'Azul', size: '6', quantity: 2 },
  { color: 'Rojo', size: '8', quantity: 1 }
]
```

### Ejemplo de `summary`
```js
summary: {
  quantity: 3,
  priceWithoutDiscount: 1000.00,
  priceWithDiscount: 800.00
}
```

## Uso

```jsx
import CartDetailsProductCard from 'src/components/CartDetailsProductCard';

<CartDetailsProductCard
  image="/images/product.png"
  sku="123456"
  title="Producto de ejemplo"
  isDiscount={true}
  discountLabel="Descuento especial"
  price={29.99}
  variants={[
    { color: 'Azul', size: 'M', quantity: 2 },
    { color: 'Rojo', size: 'L', quantity: 1 }
  ]}
  summary={{ quantity: 3, priceWithoutDiscount: 100, priceWithDiscount: 80 }}
  onRemove={variantIdx => ...}
  onQuantityChange={(variantIdx, newQty) => ...}
/>
```

## Hook: `useIsDesktop`
El componente utiliza el hook `useIsDesktop` para detectar si la pantalla es desktop o mobile y renderizar la vista adecuada automáticamente. No es necesario pasar ninguna prop adicional para esto.

## Buenas prácticas
- Importa siempre desde la carpeta: `import CartDetailsProductCard from 'src/components/CartDetailsProductCard'`.
- Mantén los handlers desacoplados de la lógica interna del componente.
- Los estilos están preparados para mobile-first y adaptan la vista en desktop.

---

**Cualquier duda o mejora, consulta este README antes de modificar el componente.** 