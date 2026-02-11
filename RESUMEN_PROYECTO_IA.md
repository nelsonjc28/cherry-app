# RESUMEN PROYECTO CHERRY APP - CONTEXTO PARA IA

## Descripción del Proyecto (25 líneas máximo)

Cherry App es una plataforma de e-commerce desarrollada con Laravel 12 (PHP 8.2+) y React 19, diseñada para gestionar productos, pedidos, catálogos digitales y pagos mediante MercadoPago. El sistema sincroniza productos desde una API externa (`https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`) mediante un cronjob que ejecuta el comando `products:sync`. Los usuarios se autentican mediante JWT y tienen roles (admin, operator, client) y categorías de vendedor (oro, plata, bronce) que determinan su crédito disponible. Los productos tienen múltiples variantes (colores/tallas) almacenadas en `detalles`, y el stock se calcula sumando `inventario_d` de todas las variantes. El sistema maneja productos "nuevos" (fecha_alta dentro de 30 días o opc_nuevo='S'), "próximamente" (fecha_alta null o sin stock), y productos con ofertas aplicables por catálogo o por usuario. Las imágenes se almacenan en AWS S3 y las URLs se generan dinámicamente. El carrito es persistente en BD y se sincroniza entre dispositivos. Los pedidos pueden pagarse con crédito o MercadoPago, y los usuarios "oro" pueden hacer encargos de productos "próximamente".

---

## Entidades Principales

1. **users**: Usuarios con roles, categorías de vendedor y crédito
2. **productos**: Productos principales con 10 niveles de precios
3. **detalles**: Variantes de productos (colores/tallas) con stock individual
4. **orders**: Pedidos con estados y métodos de pago
5. **order_items**: Items individuales dentro de pedidos
6. **carts**: Carritos de compra persistentes
7. **cart_items**: Items del carrito
8. **addresses**: Direcciones de envío con coordenadas
9. **catalogs**: Catálogos digitales con imágenes y PDFs
10. **catalog_products**: Relación muchos-a-muchos entre catálogos y productos
11. **catalog_offers**: Ofertas por catálogo
12. **user_offers**: Ofertas personalizadas por usuario
13. **favorites**: Productos favoritos
14. **reviews**: Reseñas y calificaciones
15. **notifications**: Notificaciones para usuarios
16. **historials**: Registro de ejecuciones del cronjob
17. **categories**: Categorías de productos
18. **lineas**: Líneas de productos
19. **generos**: Géneros
20. **sectores**: Sectores

---

## Flujos Críticos

### 1. Autenticación JWT
- Login/registro → Backend genera token JWT → Frontend almacena en localStorage → Token incluido en headers de peticiones API → Middleware `auth:api` valida token

### 2. Sincronización de Productos
- Cronjob ejecuta `products:sync` → Fetch desde API externa → Mapeo de datos → Actualización/creación en BD → Registro en `Historial`

### 3. Compra Completa
- Agregar productos al carrito → Seleccionar dirección y método de pago → Si MercadoPago: crear preferencia → Usuario completa pago → Webhook actualiza estado → Crear pedido → Actualizar stock y crédito

### 4. Ofertas y Descuentos
- Cargar ofertas de catálogo (`CatalogOffer`) → Cargar ofertas de usuario (`UserOffer`) → Calcular precio final aplicando descuentos → Tipos: porcentaje, buy_x_get_y, order_discount, free_shipping

### 5. Imágenes de Productos
- Producto tiene campo `imagen` → `productImageUtils.js` genera URL S3: `https://cherry-fotos.s3.amazonaws.com/shopify/{id}/{id}_{number}.jpg` → Si no existe, mostrar placeholder

---

## Decisiones Arquitectónicas Clave

1. **Producto.id es string**: Viene de API externa, no es auto-incremental
2. **Stock calculado**: Suma de `inventario_d` de `detalles`, no solo `inventario` de `productos`
3. **Carrito persistente**: Guardado en BD, no solo localStorage
4. **Productos "Próximamente"**: Lógica compleja basada en `fecha_alta`, `stock_received_count` e `inventario`
5. **Usuarios "Oro"**: Pueden hacer encargos aunque no haya stock
6. **Ofertas múltiples**: Aplicables por catálogo y por usuario, con diferentes tipos
7. **JWT en localStorage**: Vulnerable a XSS pero funcional
8. **URLs S3 dinámicas**: Generadas en frontend, no almacenadas en BD
9. **Sincronización externa**: Dependencia crítica de API externa
10. **MercadoPago**: Integración completa con preferencias y webhooks

---

## Reglas que la IA Debe Respetar

1. **NUNCA modificar migraciones existentes** → Crear nuevas migraciones
2. **SIEMPRE validar inputs** → Tanto en frontend como backend
3. **MANTENER estructura de respuesta JSON** → Consistente con formato existente
4. **NO cambiar Producto.id a integer** → Es string por diseño
5. **CALCULAR stock correctamente** → Sumar `inventario_d` de `detalles`
6. **RESPETAR lógica de "próximamente"** → `fecha_alta null` O (`stock_received_count = 0` AND `inventario <= 0`)
7. **RESPETAR lógica de "nuevos"** → `fecha_alta` dentro de 30 días O `opc_nuevo = 'S'`
8. **USAR middleware `auth:api`** → En rutas que requieren autenticación
9. **VERIFICAR `user_id`** → En operaciones que modifican datos del usuario
10. **MANEJAR errores apropiadamente** → Todos los casos de error deben manejarse
11. **NO hardcodear valores** → Usar variables de entorno o constantes
12. **MANTENER compatibilidad** → Con estructura de datos existente
13. **USAR transacciones DB** → Para operaciones críticas
14. **GENERAR URLs S3** → Usando `productImageUtils.js`, no hardcodear
15. **RESPETAR tipos de ofertas** → porcentaje, buy_x_get_y, order_discount, free_shipping
16. **NO aplicar ofertas a "próximamente"** → Solo a productos con stock
17. **SINCRONIZAR carrito** → Entre dispositivos usando BD
18. **VALIDAR stock antes de crear pedido** → Verificar disponibilidad
19. **ACTUALIZAR stock después de pedido** → Reducir inventario
20. **REGISTRAR en Historial** → Todas las ejecuciones del cronjob

---

## Archivos Críticos

**Backend:**
- `app/Http/Controllers/Api/AuthController.php`
- `app/Http/Controllers/Api/ProductController.php`
- `app/Http/Controllers/Api/ProductSyncController.php`
- `app/Http/Controllers/Api/OrderController.php`
- `app/Http/Controllers/Api/CartController.php`
- `app/Http/Controllers/Api/MercadoPagoController.php`
- `app/Models/Producto.php`
- `app/Models/Order.php`
- `app/Models/User.php`
- `app/Console/Commands/SyncProductsCommand.php`
- `routes/api.php`

**Frontend:**
- `resources/js/components/SimpleApp.jsx`
- `resources/js/store/cartStore.js`
- `resources/js/store/userStore.js`
- `resources/js/api/cherryApi.js`
- `resources/js/services/api.js`
- `resources/js/utils/productImageUtils.js`
- `resources/js/pages/ProductPage.jsx`
- `resources/js/pages/CartPage.jsx`
- `resources/js/pages/CheckoutPage.jsx`

---

## Convenciones

- **Modelos**: PascalCase (`Producto`, `Order`)
- **Controladores**: PascalCase + Controller (`ProductController`)
- **Componentes React**: PascalCase (`ProductCard.jsx`)
- **Variables**: camelCase
- **Rutas API**: kebab-case (`/api/products/new`)
- **Middleware**: `auth:api` para autenticación, `admin` para admin

---

## Dependencias Críticas

**Backend:**
- `laravel/framework: ^12.0`
- `tymon/jwt-auth: ^2.2`
- `mercadopago/dx-php: ^3.8`

**Frontend:**
- `react: ^19.1.0`
- `react-router-dom: ^7.6.3`
- `zustand: ^5.0.6`
- `axios: ^1.10.0`

---

## Riesgos y Precauciones

1. **API Externa**: Dependencia crítica, implementar retry logic
2. **JWT en localStorage**: Vulnerable a XSS, considerar httpOnly cookies
3. **Stock**: Cálculo complejo, centralizar lógica
4. **Imágenes S3**: URLs hardcodeadas, centralizar generación
5. **Sincronización**: Si falla, productos desactualizados

---

## Comandos Útiles

- `php artisan products:sync` - Sincronizar productos
- `php artisan migrate` - Ejecutar migraciones
- `php artisan tinker` - Consola interactiva
- `npm run dev` - Desarrollo frontend
- `npm run build` - Build producción

---

Este resumen debe usarse como contexto persistente en cada sesión de trabajo con la IA.
