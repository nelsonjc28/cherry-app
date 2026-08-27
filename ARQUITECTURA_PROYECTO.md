# ARQUITECTURA DEL PROYECTO CHERRY APP

## 1. VISIÓN GENERAL

**Cherry App** es una plataforma de e-commerce desarrollada con arquitectura full-stack que permite a usuarios (vendedores) gestionar pedidos, productos, catálogos y realizar compras con integración de pagos mediante MercadoPago.

### Stack Tecnológico

**Backend:**
- Laravel 12.0 (PHP 8.2+)
- MySQL (base de datos principal)
- JWT Authentication (tymon/jwt-auth)
- MercadoPago SDK (mercadopago/dx-php)
- Eloquent ORM

**Frontend:**
- React 19.1.0 (SPA)
- React Router DOM 7.6.3
- Zustand 5.0.6 (gestión de estado global)
- Vite 6.2.4 (build tool)
- Tailwind CSS 4.0.0
- Axios (cliente HTTP)

**Servicios Externos:**
- AWS S3 (almacenamiento de imágenes)
- API Externa: `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`
- MercadoPago (procesamiento de pagos)

---

## 2. ARQUITECTURA DE CAPAS

### 2.1. Backend (Laravel)

```
app/
├── Console/
│   ├── Commands/
│   │   └── SyncProductsCommand.php    # Sincronización de productos desde API externa
│   └── Kernel.php                      # Configuración de cronjobs
├── Http/
│   ├── Controllers/
│   │   └── Api/                        # Controladores API REST
│   │       ├── AuthController.php      # Autenticación JWT
│   │       ├── ProductController.php   # Gestión de productos
│   │       ├── ProductSearchController.php
│   │       ├── ProductSyncController.php
│   │       ├── OrderController.php     # Gestión de pedidos
│   │       ├── CartController.php     # Carrito de compras
│   │       ├── MercadoPagoController.php
│   │       ├── AddressController.php
│   │       ├── FavoriteController.php
│   │       ├── CategoryController.php
│   │       ├── AdminCatalogController.php
│   │       ├── UserOfferController.php
│   │       ├── HistorialController.php
│   │       ├── PublicAffiliateContentController.php
│   │       ├── AffiliateCrudTrait.php
│   │       ├── AdminAffiliateBannerController.php
│   │       ├── AdminAffiliateSeasonController.php
│   │       ├── AdminAffiliateSeasonBoxController.php
│   │       ├── AdminAffiliatePromoBannerController.php
│   │       ├── AdminAffiliateBottomBannerController.php
│   │       ├── AdminAffiliateFaqController.php
│   │       └── AdminAffiliateTrendController.php
│   ├── Middleware/
│   │   ├── Authenticate.php           # Middleware JWT
│   │   └── AdminMiddleware.php        # Verificación de rol admin
│   └── Kernel.php                     # Registro de middleware
├── Models/                            # Modelos Eloquent
│   ├── Producto.php
│   ├── Detalle.php
│   ├── Order.php
│   ├── OrderItem.php
│   ├── User.php
│   ├── Address.php
│   ├── Cart.php
│   ├── CartItem.php
│   ├── Catalog.php
│   ├── CatalogProduct.php
│   ├── CatalogOffer.php
│   ├── UserOffer.php
│   ├── Favorite.php
│   ├── Review.php
│   ├── Notification.php
│   ├── Category.php
│   ├── Linea.php
│   ├── Genero.php
│   ├── Sector.php
│   ├── Historial.php
│   ├── AffiliateBanner.php
│   ├── AffiliateSeason.php
│   ├── AffiliateSeasonBox.php
│   ├── AffiliatePromoBanner.php
│   ├── AffiliateBottomBanner.php
│   ├── AffiliateFaq.php
│   └── AffiliateTrend.php
└── Services/                          # Servicios de negocio (si existen)
```

### 2.2. Frontend (React)

```
resources/js/
├── components/                        # Componentes reutilizables
│   ├── Header/
│   ├── Footer/
│   ├── ProductCard/
│   ├── CatalogFilter/
│   ├── OrderDetailModal/
│   └── ...
├── pages/                            # Páginas/Views
│   ├── HomePage.jsx
│   ├── ProductPage.jsx
│   ├── CartPage.jsx
│   ├── CheckoutPage.jsx
│   ├── NuevosPage.jsx
│   ├── ProximamentePage.jsx
│   ├── DestacadosPage.jsx
│   ├── CategoryPage.jsx
│   ├── PromocionesPage.jsx
│   ├── FavoritosPage.jsx
│   ├── AdminPanelPage.jsx
│   ├── auth/RegisterPage.jsx
│   └── ...
├── components/AffiliateFaq/          # FAQ y banners promocionales
├── components/AdminAffiliateContentManager/ # CRUD administrativo de afiliación
├── store/                            # Zustand stores
│   ├── cartStore.js
│   └── userStore.js
├── api/                              # Clientes API
│   ├── cherryApi.js                  # API externa
│   └── userOffers.js
├── services/                         # Servicios frontend
│   └── api.js                        # Cliente Axios configurado
├── utils/                            # Utilidades
│   └── productImageUtils.js
└── components/
    └── SimpleApp.jsx                 # Router principal
```

---

## 3. MÓDULOS PRINCIPALES

### 3.1. Autenticación y Usuarios
- **JWT Authentication**: Login, registro, refresh tokens
- **Roles**: Admin, Operator, Client
- **Categorías de vendedor**: oro, plata, bronce (determina crédito disponible)
- **Crédito**: Balance y límite de crédito por usuario

### 3.2. Productos
- **Sincronización**: Comando Artisan `products:sync` que sincroniza desde API externa
- **Estados**: Nuevo (30 días), Próximamente (sin stock o fecha_alta null), Agotado
- **Precios**: 10 niveles de precios (precio1-precio10)
- **Stock**: Inventario general + inventario por detalle (color/talla)
- **Imágenes**: Almacenadas en AWS S3, URLs generadas dinámicamente

### 3.3. Catálogos
- **Catálogos**: Catálogos digitales con imágenes agrupadas
- **Ofertas**: Ofertas por catálogo (CatalogOffer) y por usuario (UserOffer)
- **PDFs**: Generación y visualización de catálogos en PDF
- **Productos en catálogo**: Relación muchos-a-muchos entre Catalog y Producto

### 3.4. Carrito y Pedidos
- **Carrito**: Persistido en base de datos (tabla `carts` y `cart_items`)
- **Pedidos**: Estados: pendiente, preparado, enviado, entregado
- **Métodos de pago**: Crédito, MercadoPago
- **Encargos**: Usuarios "oro" pueden hacer encargos de productos "próximamente"

### 3.5. Direcciones y Envíos
- **Direcciones**: Múltiples direcciones por usuario, una por defecto
- **Campos**: Calle, número, colonia, ciudad, estado, código postal, coordenadas

### 3.6. Favoritos y Reseñas
- **Favoritos**: Lista de productos favoritos por usuario
- **Reseñas**: Sistema de calificaciones y comentarios (aprobación requerida)

### 3.7. Notificaciones
- **Notificaciones**: Sistema de notificaciones para usuarios
- **Interés en productos**: Notificación cuando un producto "próximamente" está disponible

### 3.8. Historial
- **Historial**: Registro de ejecuciones del cronjob de sincronización de productos
- **Filtros**: Por fecha de ejecución
- **Estados**: Exitoso, Error

### 3.9. Contenido de Afiliación
- **Página pública**: `/registro` consume `GET /api/affiliate-content`.
- **Contenido**: banner superior, temporada, recuadros de temporada, tendencias, banners promocionales, FAQ y banner inferior.
- **Administración**: CRUD protegido para cada tipo mediante rutas `/api/admin/affiliate-*`.
- **Enlaces**: `button_url` permite redirigir imágenes o botones; la temporada puede enlazar una URL sin depender de un catálogo.
- **Estado**: banners superior, promocional e inferior controlan contenido activo; las tendencias admiten múltiples registros activos.

---

## 4. FLUJOS CRÍTICOS

### 4.1. Flujo de Autenticación
1. Usuario registra/login → `AuthController`
2. Backend genera JWT token → `tymon/jwt-auth`
3. Token almacenado en `localStorage` (frontend)
4. Token incluido en headers de peticiones API
5. Middleware `auth:api` valida token en cada request

### 4.2. Flujo de Sincronización de Productos
1. Cronjob ejecuta `products:sync` (o comando manual)
2. `SyncProductsCommand` llama a `ProductSyncController`
3. Fetch desde API externa: `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`
4. Mapeo de datos externos a modelo `Producto`
5. Actualización/creación en BD
6. Registro en `Historial` (éxito/error)

### 4.3. Flujo de Compra
1. Usuario agrega productos al carrito → `CartController`
2. Selecciona dirección y método de pago
3. Si MercadoPago: `MercadoPagoController` crea preferencia
4. Usuario completa pago en MercadoPago
5. Webhook de MercadoPago notifica estado
6. `OrderController` crea pedido
7. Actualización de stock y crédito (si aplica)

### 4.4. Flujo de Ofertas y Descuentos
1. Sistema carga ofertas de catálogo (`CatalogOffer`)
2. Sistema carga ofertas de usuario (`UserOffer`)
3. Frontend calcula precio final aplicando descuentos
4. Tipos: porcentaje, buy_x_get_y, order_discount, free_shipping

### 4.5. Flujo de Imágenes de Productos
1. Producto tiene campo `imagen` (nombre de archivo)
2. `productImageUtils.js` genera URL S3: `https://cherry-fotos.s3.amazonaws.com/shopify/{id}/{id}_{number}.jpg`
3. Si imagen no existe, se muestra placeholder
4. Backend también puede servir imágenes como proxy (`ProductImageController`)

---

## 5. BASE DE DATOS

### 5.1. Entidades Principales

**productos**: Productos principales
- `id` (string, PK)
- `descripcion`, `marca`, `precio1-precio10`
- `fecha_alta`, `opc_nuevo`, `opc_promo`
- `inventario`, `stock_received_count`
- `id_linea`, `catalogoId`, `sector_id`, `genero_id`

**detalles**: Variantes de productos (colores/tallas)
- `id` (integer, PK)
- `producto_id` (FK → productos)
- `nombreColor`, `detalle` (talla)
- `inventario_d` (stock por variante)

**users**: Usuarios del sistema
- `id` (PK)
- `email`, `password`, `first_name`, `last_name`
- `role_id`, `seller_category`
- `credit_balance`, `credit_limit`

**orders**: Pedidos
- `id` (PK)
- `user_id` (FK → users)
- `address_id` (FK → addresses)
- `total_amount`, `subtotal`, `discounted_total`
- `status`, `payment_method`
- `mercadopago_preference_id`, `mercadopago_payment_id`

**order_items**: Items de pedidos
- `id` (PK)
- `order_id` (FK → orders)
- `product_id` (string, referencia a productos)
- `color`, `size`, `quantity`, `price`

**carts**: Carritos de compra
- `id` (PK)
- `user_id` (FK → users)

**cart_items**: Items del carrito
- `id` (PK)
- `cart_id` (FK → carts)
- `product_id`, `color`, `size`, `quantity`

**catalogs**: Catálogos
- `id` (PK)
- `name`, `code`, `image`, `pdf_path`

**catalog_products**: Relación muchos-a-muchos entre catálogos y productos

**catalog_offers**: Ofertas por catálogo
- `id` (PK)
- `catalog_id` (FK → catalogs)
- `discount_percentage`, `discount_category`

**user_offers**: Ofertas por usuario
- `id` (PK)
- `user_id` (FK → users)
- `discount_percentage`, `discount_category`

**addresses**: Direcciones de envío
- `id` (PK)
- `user_id` (FK → users)
- `street_address`, `city`, `state`, `postal_code`
- `is_default`

**favorites**: Productos favoritos
- `id` (PK)
- `user_id` (FK → users)
- `product_id` (string, referencia a productos)

**reviews**: Reseñas de productos
- `id` (PK)
- `user_id` (FK → users)
- `product_id` (string)
- `rating`, `comment`, `is_approved`

**notifications**: Notificaciones
- `id` (PK)
- `user_id` (FK → users)
- `message`, `type`, `read_at`

**historials**: Historial de sincronizaciones
- `id` (PK)
- `ejecutado_at`, `estado`, `mensaje`

**categories**: Categorías
- `id` (PK)
- `name`, `description`

**lineas**: Líneas de productos
- `id` (PK)
- `name`

**generos**: Géneros
- `id` (PK)
- `name`

**sectores**: Sectores
- `id` (PK)
- `name`

**affiliate_banners**: Banner superior editable de `/registro`
- `title`, `subtitle`, `button_text`, `button_url`, `image_path`, `is_active`, `display_order`

**affiliate_seasons**: Sección de temporada
- `title`, `button_url`, `catalog_id`, `image_path`, `is_active`, `display_order`

**affiliate_season_boxes**: Recuadros asociados a una temporada
- `affiliate_season_id`, `title`, `description`, `button_text`, `button_url`, `image_path`, `is_active`, `display_order`

**affiliate_trends**: Tarjetas de tendencias
- `title`, `button_url`, `image_path`, `is_active`, `display_order`

**affiliate_promo_banners**: Banners promocionales de la sección FAQ
- `image_path`, `button_url`, `is_active`, `display_order`

**affiliate_bottom_banners**: Banner inferior de la sección FAQ
- `image_path`, `button_url`, `is_active`, `display_order`

**affiliate_faqs**: Preguntas frecuentes dinámicas
- `question`, `answer`, `display_order`, `is_active`

### 5.2. Relaciones Clave

- `Producto` hasMany `Detalle`
- `Producto` belongsTo `Linea` (id_linea)
- `Order` belongsTo `User`
- `Order` hasMany `OrderItem`
- `User` hasMany `Order`
- `User` hasMany `Address`
- `User` hasMany `Favorite`
- `Cart` belongsTo `User`
- `Cart` hasMany `CartItem`
- `Catalog` belongsToMany `Producto` (vía `catalog_products`)
- `CatalogOffer` belongsTo `Catalog`
- `UserOffer` belongsTo `User`
- `AffiliateSeason` belongsTo `Catalog` y hasMany `AffiliateSeasonBox`
- `AffiliateSeasonBox` belongsTo `AffiliateSeason`

---

## 6. RUTAS API PRINCIPALES

### Autenticación
- `POST /api/register`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`

### Productos
- `GET /api/products/search?q=`
- `GET /api/products/new`
- `GET /api/products/coming-soon`
- `GET /api/products/{id}`
- `GET /api/top-selling`

### Carrito
- `GET /api/cart`
- `PUT /api/cart`
- `DELETE /api/cart`
- `POST /api/cart/sync`

### Pedidos
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/{id}`

### Direcciones
- `GET /api/addresses`
- `POST /api/addresses`
- `PUT /api/addresses/{id}`
- `DELETE /api/addresses/{id}`

### Favoritos
- `GET /api/favorites`
- `POST /api/favorites/toggle`

### Catálogos
- `GET /api/admin/catalogs`
- `GET /api/public/catalogs-with-images`

### Ofertas
- `GET /api/user-offers`
- `GET /api/user-offers/products`

### Historial
- `GET /api/admin/historial`

### Contenido público de afiliación
- `GET /api/affiliate-content` - Devuelve `banner`, `season`, `promo_banners`, `bottom_banner`, `faqs` y `trends`.

### Administración de afiliación
- CRUD `/api/admin/affiliate-banners`
- CRUD `/api/admin/affiliate-seasons`
- CRUD `/api/admin/affiliate-seasons/{seasonId}/boxes`
- CRUD `/api/admin/affiliate-promo-banners`
- CRUD `/api/admin/affiliate-bottom-banners`
- CRUD `/api/admin/affiliate-faqs`
- CRUD `/api/admin/affiliate-trends`

---

## 7. CONFIGURACIÓN Y VARIABLES DE ENTORNO

### Variables críticas (.env)
- `DB_CONNECTION=mysql`
- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- `MERCADOPAGO_ACCESS_TOKEN`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`
- `EXTERNAL_API_URL` (hardcoded en código: `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`)

---

## 8. CRONJOBS Y TAREAS PROGRAMADAS

### Sincronización de Productos
- **Comando**: `php artisan products:sync`
- **Frecuencia**: Configurado en `app/Console/Kernel.php`
- **Función**: Sincroniza productos desde API externa y registra en `Historial`

---

## 9. ÁREAS CRÍTICAS Y RIESGOS

### 9.1. Riesgos Técnicos
1. **API Externa**: Dependencia crítica de API externa para sincronización
2. **Sincronización**: Si falla, productos pueden quedar desactualizados
3. **Stock**: Cálculo complejo entre `inventario` y `inventario_d` de detalles
4. **Imágenes S3**: URLs hardcodeadas, si cambia estructura S3 puede romper
5. **JWT**: Tokens almacenados en localStorage (vulnerable a XSS)

### 9.2. Deuda Técnica
1. **Código duplicado**: Lógica de filtrado repetida en múltiples páginas
2. **Validación**: Algunas validaciones solo en frontend
3. **Error handling**: Manejo de errores inconsistente
4. **Logging**: Falta logging estructurado en algunos flujos críticos

### 9.3. Complejidades Arquitectónicas
1. **Productos "Próximamente"**: Lógica compleja para determinar estado
2. **Ofertas**: Múltiples tipos de ofertas con lógica de aplicación compleja
3. **Precios múltiples**: 10 niveles de precios, lógica de selección compleja
4. **Stock por variante**: Cálculo de stock total requiere sumar `inventario_d`

---

## 10. CONVENCIONES Y ESTÁNDARES

### Backend
- Controladores en `app/Http/Controllers/Api/`
- Modelos en `app/Models/`
- Migraciones en `database/migrations/`
- Rutas API en `routes/api.php`
- Middleware: `auth:api` para autenticación, `admin` para admin

### Frontend
- Componentes en `resources/js/components/`
- Páginas en `resources/js/pages/`
- Stores Zustand en `resources/js/store/`
- Utilidades en `resources/js/utils/`
- API clients en `resources/js/api/`

### Nomenclatura
- Modelos: PascalCase (`Producto`, `Order`)
- Controladores: PascalCase + Controller (`ProductController`)
- Componentes React: PascalCase (`ProductCard.jsx`)
- Variables: camelCase
- Rutas API: kebab-case (`/api/products/new`)

---

## 11. DEPENDENCIAS CRÍTICAS

### Backend
- `laravel/framework: ^12.0`
- `tymon/jwt-auth: ^2.2`
- `mercadopago/dx-php: ^3.8`

### Frontend
- `react: ^19.1.0`
- `react-router-dom: ^7.6.3`
- `zustand: ^5.0.6`
- `axios: ^1.10.0`

---

## 12. PRÓXIMOS PASOS SUGERIDOS

1. **Refactorización**: Extraer lógica de negocio a Services
2. **Testing**: Implementar tests unitarios y de integración
3. **Documentación API**: Generar documentación Swagger/OpenAPI
4. **Optimización**: Implementar caché para productos y catálogos
5. **Seguridad**: Revisar validaciones y sanitización de inputs
6. **Monitoreo**: Implementar logging estructurado y monitoreo de errores
