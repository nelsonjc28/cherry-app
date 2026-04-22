---
title: Contexto integral del proyecto Cherry App
language: es
purpose: Referencia persistente para entender arquitectura, flujos de negocio, decisiones actuales y contexto operativo del proyecto.
last_updated: 2026-04-17
---

# Contexto integral del proyecto Cherry App

Este archivo resume el contexto técnico y funcional del proyecto para futuras conversaciones y cambios. Su objetivo es reducir tiempo de exploración, mantener consistencia y documentar reglas de negocio visibles en el código.

## 1. Resumen ejecutivo

- Proyecto full-stack basado en **Laravel 12 + React 19 + Vite**.
- El backend expone una **API REST** bajo `/api`.
- El frontend es una **SPA/PWA** servida por Laravel.
- El sistema gestiona:
  - catálogo y producto
  - carrito persistente
  - checkout
  - Mercado Pago
  - OXXO / pagos en efectivo vía Mercado Pago
  - crédito Cherry
  - pedidos directos para usuarios Oro/Diamante
  - pedidos adelantados / "Próximamente"
  - panel administrativo
  - correos y notificaciones
  - integración con API externa de ventas y sincronización de productos

## 2. Stack y dependencias principales

### Backend

- PHP `^8.2`
- Laravel `^12.0`
- JWT Auth con `tymon/jwt-auth`
- SDK Mercado Pago `mercadopago/dx-php`

Archivo base:
- `composer.json`

### Frontend

- React `^19.1.0`
- React Router `^7.6.3`
- Zustand `^5.0.6`
- Axios
- SweetAlert2
- React Query
- Vite

Archivo base:
- `package.json`

## 3. Estructura general del proyecto

### Backend principal

- `app/Http/Controllers/`
  - `PaymentController.php`: núcleo del checkout, órdenes y pagos
  - `Admin/AdminOrderController.php`: lógica admin de órdenes
  - `Api/*`: auth, catálogo, carrito, checkout, productos, etc.
- `app/Models/`
  - `User.php`
  - `Order.php`
  - `OrderItem.php`
  - `Cart.php`
  - `Address.php`
  - `Producto.php`
  - `Detalle.php`
  - `Notification.php`
- `app/Services/`
  - `MercadoPagoService.php`
  - `ExternalSalesService.php`
  - `OrderPricingService.php`
  - `PriceService.php`
  - `OrderCreditSplitService.php`
  - `CreditAvailabilityService.php`
  - `UserSellerCategoryActivityService.php`
- `routes/`
  - `api.php`
  - `web.php`
  - `console.php`
- `resources/views/`
  - impresión de órdenes
  - correos
  - vista shell de la SPA

### Frontend principal

- `resources/js/components/`
- `resources/js/pages/`
- `resources/js/store/`
- `resources/js/services/`
- `resources/js/api/`
- `resources/js/utils/`
- `resources/js/contexts/`

## 4. Cómo se sirve la aplicación

- Laravel sirve la SPA desde `routes/web.php`.
- La ruta `/` y el catch-all de frontend devuelven `resources/views/app.blade.php`.
- La API vive en `routes/api.php`.
- Existen rutas web especiales para:
  - sincronización de productos
  - previsualización local de correos
  - impresión de órdenes

## 5. Autenticación y roles

### Auth

- La API usa **JWT**.
- El frontend persiste token en `localStorage`.
- El estado del usuario se administra principalmente desde:
  - `resources/js/store/userStore.js`

### Roles visibles

- `admin`
- `operador`
- `cliente`

### Categorías de vendedor

Campo importante en `User`:
- `seller_category`

Valores de negocio frecuentes:
- `bronce`
- `oro`
- `diamante`

Estas categorías cambian:
- descuentos por volumen
- acceso a crédito
- pedido directo
- visibilidad de ciertas acciones de pago

## 6. Frontend: puntos de entrada y navegación

Archivos clave:
- `resources/js/main.jsx`
- `resources/js/App.jsx`
- `resources/js/components/SimpleApp.jsx`

### Rutas importantes

- `/`
- `/catalogo`
- `/catalogo/:id`
- `/producto/:productId`
- `/carrito`
- `/carrito-detalle`
- `/compra-exitosa`
- `/pago-pendiente`
- `/perfil/*`
- `/admin/*`

### Páginas críticas

- `resources/js/pages/ProductPage.jsx`
- `resources/js/pages/CartDetailsPage.jsx`
- `resources/js/pages/checkout/CheckoutForm.jsx`
- `resources/js/pages/CheckoutSuccessPage.jsx`
- `resources/js/pages/profile/MyOrders.jsx`
- `resources/js/pages/profile/Addresses.jsx`
- `resources/js/pages/admin/AdminOrders.jsx`
- `resources/js/pages/AdminPanelPage.jsx`

## 7. Estado global y persistencia en frontend

### Carrito

Store principal:
- `resources/js/store/cartStore.js`

Responsabilidades:
- agregar y quitar productos
- persistencia guest en `localStorage`
- persistencia autenticada en BD vía `/api/cart`
- sincronización entre carrito local y backend
- cálculo de totales
- promociones tipo Buy X Get Y
- desglose de precios y descuentos

### Usuario

Store principal:
- `resources/js/store/userStore.js`

Responsabilidades:
- login / logout / register
- carga del usuario autenticado
- token
- helpers de rol

### Otros estados relevantes

- Favoritos: `resources/js/contexts/FavoritesContext.jsx`
- API externa / caché de productos: `resources/js/contexts/ExternalApiContext.jsx`
- productos vistos recientemente: `resources/js/store/recentProductsStore.js`

## 8. Clientes HTTP en frontend

Hay varios puntos de acceso HTTP:

- `resources/js/services/api.js`
  - axios con `baseURL: /api`
  - expone servicios por dominio
- `resources/js/config/axios.js`
  - otra instancia axios para llamadas directas
- `resources/js/api/cartApi.js`
  - usa `fetch` para `/api/cart`
- `resources/js/api/cherryApi.js`
  - consume la **API externa** de catálogo/productos

Esto es importante porque no todo el frontend habla con el backend de la misma manera.

## 9. Dominio principal del sistema

### Pedidos

Modelo:
- `app/Models/Order.php`

Campos y conceptos relevantes:
- `status`
- `payment_method`
- `payment_data` (JSON)
- `amount_paid`
- `amount_pending`
- `credit_used`
- `paid_with_credit`
- `shipping_amount`
- `discounted_total`
- `subtotal`
- `descuento1`
- `descuento2`
- `is_advance_order`
- `mercadopago_payment_id`
- `external_reference`

### Líneas de pedido

Modelo:
- `app/Models/OrderItem.php`

Campos relevantes:
- `product_id`
- `detalle_id`
- `price`
- `subtotal`
- `size`
- `color`
- `barcode`

### Direcciones

Modelo:
- `app/Models/Address.php`

Campos destacados:
- `street_address`
- `street_number_ext`
- `street_number_int`
- `city`
- `municipality`
- `colonia`
- `state`
- `postal_code`
- `country`
- `additional_info`

Formatter clave:
- `admin_formatted_address`

### Catálogo y variantes

Modelos:
- `app/Models/Producto.php`
- `app/Models/Detalle.php`

`Detalle` representa talla/color/inventario por variante.

## 10. Flujo de catálogo y producto

### Carga de producto

Archivo clave:
- `app/Http/Controllers/Api/ProductController.php`

Observación importante:
- el endpoint `show` del producto usa BD y está comentado como **sin caché** para esos datos.

En frontend:
- `resources/js/pages/ProductPage.jsx`

Responsabilidades:
- cargar producto por ID
- aplicar descuentos / ofertas
- manejar tallas y colores
- validar stock
- agregar al carrito
- registrar producto visto

### Incidencia importante ya observada

El flujo de agregar varias tallas se apoya en `cartStore.addToCart`. En `ProductPage.jsx`, las inserciones múltiples deben ejecutarse serialmente para no pisarse; esto fue un punto revisado durante conversaciones previas.

## 11. Carrito y checkout

### Vista de carrito / checkout

Archivos centrales:
- `resources/js/pages/CartDetailsPage.jsx`
- `resources/js/components/CartOrderSummary/CartOrderSummary.jsx`
- `resources/js/components/OrderAmountCard/OrderAmountCard.jsx`
- `resources/js/components/AddressSelector/AddressSelector.jsx`

### Lógica de precios

Archivos clave:
- `resources/js/store/cartStore.js`
- `resources/js/utils/cartVolumePricing.js`
- `resources/js/utils/sellerVolumeDiscount.js`
- `app/Services/OrderPricingService.php`
- `app/Services/PriceService.php`

### Qué significan los bloques de precio

- **Subtotal Base**: suma de `precio1` x cantidad
- **Descuento por Rebaja**: ahorro de líneas con `desc_promo` o promo equivalente
- **Subtotal con rebaja**: mercancía al precio real de carrito, antes del descuento global por volumen
- **Descuento Mayoreo**: primer tramo de volumen
- **Adicional 10%**: segundo tramo sobre el remanente, solo si la base elegible cumple umbral
- **Envío**: puede ser 0 por retiro o por umbral de envío gratis

### Regla importante de negocio

Los productos en **rebaja** no entran a la base elegible del descuento por volumen.

En otras palabras:
- sí cuentan en el subtotal con rebaja
- no cuentan para calcular el 30%/33% y el 10% adicional

## 12. Tipos de pedido / pago

El núcleo está en:
- `app/Http/Controllers/PaymentController.php`

### 12.1 Mercado Pago por preferencia

Método:
- `createPaymentPreference`

Características:
- valida totales contra cálculo servidor
- crea orden y líneas
- genera preferencia de Mercado Pago
- el cobro se confirma por webhook o verificación posterior

### 12.2 Pago integrado Mercado Pago

Método:
- `processIntegratedPayment`

Características:
- procesa pago y orden en una sola operación
- puede crear orden ya pagada o pendiente según respuesta MP

### 12.3 OXXO / efectivo

Método:
- `createOxxoPayment`

Características:
- orden queda `pendiente_pago`
- usa pagos offline de Mercado Pago
- depende de liquidación del ticket

### 12.4 Crédito Cherry

Lógica principal:
- `processCreditPayment`
- `OrderCreditSplitService.php`
- `CreditAvailabilityService.php`

Características:
- solo aplica a usuarios elegibles
- puede ser:
  - pago completo con crédito
  - pago mixto crédito + Mercado Pago
- puede generar una parte pendiente de MP

### 12.5 Pedido directo Oro / Diamante

Método:
- `createDirectOrder`

Características:
- solo para `seller_category` `oro` o `diamante`
- no se paga al instante en el flujo normal
- se crea con:
  - `status = pendiente_pago`
  - `payment_method = pedido_directo`
  - `amount_paid = 0`
  - `amount_pending = total`

### 12.6 Pedido adelantado / Próximamente

Método:
- `createAdvanceOrder`

Características:
- `is_advance_order = true`
- estado inicial `pendiente_pago`
- puede no llevar dirección al inicio

## 13. Estados de orden

Modelo base:
- `app/Models/Order.php`

Estados frecuentes:
- `pending`
- `pendiente_pago`
- `pending_payment`
- `pagado`
- `en_espera_envio`
- `enviado`
- `cancelado`
- `cancelled`
- `pago_rechazado`

### Interpretación útil

- `pendiente_pago` no significa solo "no pagó con MP"
- puede significar:
  - pedido directo Oro/Diamante por liquidación admin
  - ticket OXXO pendiente
  - crédito Cherry pendiente
  - remanente MP pendiente
  - pedido adelantado pendiente

## 14. Webhook y verificación de pago

Archivos clave:
- `app/Http/Controllers/PaymentController.php`
- `app/Services/MercadoPagoService.php`
- `app/Http/Controllers/Api/PaymentStatusController.php`

Puntos críticos:
- webhook público de Mercado Pago
- verificación al volver del checkout
- reintentos / sincronización de estado
- manejo de pagos de saldo pendiente

## 15. Integración con API externa

### Venta externa

Servicio:
- `app/Services/ExternalSalesService.php`

Hace POST a:
- `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/venta`

Usa:
- datos de usuario
- dirección
- producto y detalle
- número de orden tipo `CD####` o `PD####`

### Sincronización de productos

Controlador:
- `app/Http/Controllers/Api/ProductSyncController.php`

Consume:
- `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`

### Flags importantes

En `payment_data`:
- `external_api_sent`
- `external_api_sent_at`

## 16. Cuándo se manda la orden a la API externa

Depende del flujo:

- **pedido directo**: se envía al crear la orden
- **pedido adelantado**: se envía al crear
- **MP aprobado**: se envía al aprobarse
- **crédito / otros flujos**: puede enviarse al marcar como pagado si aún no se había enviado

Decisión importante vigente:
- para `pedido_directo`, al marcar como pagado en admin **no se reenvía** a la API externa

## 17. Administración

### Shell admin

- `resources/js/pages/AdminPanelPage.jsx`
- `resources/js/components/AdminRoute.jsx`

### Órdenes admin

- `resources/js/pages/admin/AdminOrders.jsx`
- `app/Http/Controllers/Admin/AdminOrderController.php`

Funciones principales:
- listado
- detalle
- cambio de estado
- marcar crédito / anticipado como pagado
- tracking
- preparación

### Detalle admin de pedidos

Componente:
- `resources/js/components/OrderDetailModal/OrderDetailModal.jsx`

Muestra:
- dirección
- método de entrega
- desglose de precios
- etiquetas por producto

### Etiquetas de producto ya soportadas en admin

Desde backend:
- `REBAJA`
- `NUEVO`
- `PRÓXIMAMENTE`

La generación sale de:
- `AdminOrderController::buildProductLabelsForOrderItem`

### Desglose de precios ya soportado en admin

En el modal de detalle:
- precio original
- descuento aplicado
- precio final pagado
- subtotal / envío / total

## 18. Cliente: Mis pedidos

Archivo:
- `resources/js/pages/profile/MyOrders.jsx`

Detalle:
- `resources/js/components/OrderDetailModal/OrderDetailModal.jsx`

Reglas importantes vigentes:
- los botones de pago con Mercado Pago deben ocultarse al cliente si el usuario es:
  - `oro`
  - `diamante`

Esto aplica tanto en:
- listado de pedidos
- modal de detalle

El admin no se ve afectado por esa ocultación.

## 19. Direcciones y visualización

Archivos relevantes:
- `resources/js/pages/profile/Addresses.jsx`
- `resources/js/components/AddressSelector/AddressSelector.jsx`
- `resources/js/utils/addressDisplay.js`
- `app/Models/Address.php`

Regla importante:
- la dirección debe poder mostrar:
  - calle
  - número exterior
  - número interior

El helper central en frontend es:
- `buildStreetWithNumbers`

## 20. Correos y vistas imprimibles

### Correos

Mailables:
- `app/Mail/OrderConfirmationMail.php`
- `app/Mail/OrderStatusEmail.php`
- `app/Mail/WelcomeEmail.php`
- `app/Mail/AbandonedCartEmail.php`
- `app/Mail/ProductAvailableEmail.php`

Templates:
- `resources/views/emails/orders/confirmation.blade.php`
- `resources/views/emails/order-status.blade.php`
- `resources/views/emails/abandoned-cart.blade.php`
- otros dentro de `resources/views/emails/`

### Impresión

- `resources/views/orders/print.blade.php`
- `PaymentController::printOrder`

## 21. Notificaciones

Sistema propio:
- `app/Models/Notification.php`

Tipos visibles:
- pago
- cambio de estado
- interés en productos
- admin notifications

También existe uso del sistema de notificaciones de Laravel en algunos puntos; no todo está unificado.

## 22. Riesgos y observaciones técnicas

1. `PaymentController.php` concentra mucha lógica de negocio y es un archivo grande.
2. Hay múltiples clientes HTTP en frontend; no toda llamada usa el mismo wrapper.
3. Hay mezcla de estados legacy y nuevos en órdenes.
4. El flujo de checkout tiene caminos antiguos y nuevos conviviendo.
5. Las rutas admin no están totalmente uniformadas en permisos.
6. La lógica de pedidos directos, crédito, MP y admin se reparte entre varios archivos; cualquier cambio en órdenes exige revisar:
   - `PaymentController.php`
   - `AdminOrderController.php`
   - `MercadoPagoService.php`
   - `ExternalSalesService.php`
   - `MyOrders.jsx`
   - `OrderDetailModal.jsx`
   - `CartDetailsPage.jsx`

## 23. Decisiones y acuerdos ya tratados en conversaciones de este proyecto

### Política de trabajo del asistente

Existe una regla persistente:
- `.cursor/rules/change-confirmation-policy.mdc`

Regla:
- no modificar nada que el usuario no haya pedido explícitamente
- pedir confirmación antes de cambios extra
- sugerir posibles cambios adicionales sin implementarlos automáticamente

### Decisiones funcionales ya confirmadas

1. **Pedido directo Oro/Diamante**
   - se crea `pendiente_pago`
   - no se considera pagado al instante
   - se envía a API externa al crearse
   - al marcar `pagado` en admin no se reenvía a API externa

2. **UI del carrito**
   - se eliminó el bloque de selección "Crédito Cherry vs Pedido directo" para ese flujo
   - Oro/Diamante van por pedido directo

3. **Checkout éxito**
   - debe reflejar cuando una orden directa quedó "por pagar"

4. **Admin órdenes**
   - ya muestra etiquetas de producto
   - ya muestra desglose de precios con descuentos

5. **Cliente Oro/Diamante**
   - no debe ver botones para pagar con Mercado Pago sus órdenes pendientes desde "Mis pedidos"

## 24. Archivos más importantes para entender el proyecto rápidamente

### Backend

- `app/Http/Controllers/PaymentController.php`
- `app/Http/Controllers/Admin/AdminOrderController.php`
- `app/Services/MercadoPagoService.php`
- `app/Services/ExternalSalesService.php`
- `app/Services/OrderPricingService.php`
- `app/Models/Order.php`
- `app/Models/User.php`
- `routes/api.php`
- `routes/web.php`

### Frontend

- `resources/js/components/SimpleApp.jsx`
- `resources/js/store/cartStore.js`
- `resources/js/store/userStore.js`
- `resources/js/services/api.js`
- `resources/js/pages/ProductPage.jsx`
- `resources/js/pages/CartDetailsPage.jsx`
- `resources/js/pages/profile/MyOrders.jsx`
- `resources/js/components/OrderDetailModal/OrderDetailModal.jsx`
- `resources/js/pages/admin/AdminOrders.jsx`
- `resources/js/utils/cartVolumePricing.js`

## 25. Cómo usar este archivo en futuras conversaciones

Antes de tocar lógica de negocio crítica, revisar:

1. el flujo exacto involucrado
2. los archivos centrales del dominio afectado
3. si el cambio afecta:
   - cliente
   - admin
   - API externa
   - Mercado Pago
   - emails
   - impresión
   - notificaciones

Si hay dudas, empezar por:
- `PaymentController.php`
- `AdminOrderController.php`
- `CartDetailsPage.jsx`
- `MyOrders.jsx`
- `OrderDetailModal.jsx`

## 26. Nota final

Este contexto está hecho para continuidad operativa y conversaciones futuras. Resume la estructura, reglas actuales y decisiones ya habladas en este proyecto, pero siempre conviene validar detalles sensibles directamente en los archivos citados antes de cambios grandes o de negocio.
