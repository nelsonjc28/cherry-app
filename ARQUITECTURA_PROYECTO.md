# ARQUITECTURA DEL PROYECTO CHERRY-APP

## 1. ARQUITECTURA GENERAL

### 1.1 Patrón Arquitectónico
- **Backend**: Laravel MVC con API REST
- **Frontend**: Single Page Application (SPA) React
- **Comunicación**: JSON sobre HTTP/HTTPS
- **Autenticación**: JWT tokens almacenados en localStorage

### 1.2 Capas de la Aplicación

#### Backend (Laravel)
```
app/
├── Console/Commands/        # Comandos Artisan (ej: products:sync)
├── Http/
│   ├── Controllers/
│   │   ├── Api/            # Controladores API REST
│   │   └── Admin/          # Controladores específicos de admin
│   └── Middleware/         # Middleware personalizado (admin, auth)
├── Models/                 # Modelos Eloquent (35 modelos)
├── Services/               # Servicios de negocio (MercadoPago, ExternalSales)
└── Mail/                   # Clases de correo electrónico
```

#### Frontend (React)
```
resources/js/
├── api/                    # Clientes API y configuración
├── components/             # Componentes reutilizables (241 archivos)
├── pages/                  # Páginas/views (99 archivos)
├── hooks/                  # Custom hooks React
├── store/                  # Estado global (Zustand)
├── contexts/               # Contextos React
└── utils/                  # Utilidades y helpers
```

### 1.3 Flujo de Datos

1. **Usuario interactúa** → React Component
2. **Component llama** → API Client (axios)
3. **Request HTTP** → Laravel Route
4. **Route ejecuta** → Controller
5. **Controller usa** → Model/Service
6. **Model consulta** → Database
7. **Response JSON** → Frontend
8. **Frontend actualiza** → Estado (Zustand/State)

## 2. MÓDULOS PRINCIPALES

### 2.1 Módulo de Autenticación
- **Archivos clave**:
  - `app/Http/Controllers/Api/AuthController.php`
  - `resources/js/pages/auth/LoginPage.jsx`
  - `resources/js/store/userStore.js`
- **Flujo**:
  1. Usuario ingresa credenciales (email/teléfono + password)
  2. Backend valida y genera JWT token
  3. Frontend almacena token en localStorage
  4. Token se incluye en headers de todas las peticiones
  5. Middleware `auth:api` valida token en cada request

### 2.2 Módulo de Productos
- **Archivos clave**:
  - `app/Models/Producto.php`
  - `app/Http/Controllers/Api/ProductSyncController.php`
  - `app/Console/Commands/SyncProductsCommand.php`
  - `resources/js/api/cherryApi.js`
- **Características**:
  - Sincronización desde API externa (`https://cherryapi.estrategiadmgs.com.mx`)
  - Cache en memoria para optimización
  - Búsqueda inteligente con índices
  - Filtros por categoría, catálogo, precio, etc.

### 2.3 Módulo de Carrito y Checkout
- **Archivos clave**:
  - `app/Http/Controllers/Api/CartController.php`
  - `app/Http/Controllers/Api/CheckoutController.php`
  - `app/Http/Controllers/PaymentController.php`
  - `resources/js/store/cartStore.js`
- **Flujo de Compra**:
  1. Usuario agrega productos al carrito (localStorage + DB)
  2. Usuario selecciona dirección y método de pago
  3. Sistema calcula descuentos y envío
  4. Si usa crédito: se descuenta del balance
  5. Si paga con MercadoPago: se crea preferencia
  6. Usuario completa pago externo
  7. Webhook actualiza estado de orden
  8. Admin gestiona envío y tracking

### 2.4 Módulo de Órdenes
- **Archivos clave**:
  - `app/Models/Order.php`
  - `app/Http/Controllers/PaymentController.php`
  - `app/Http/Controllers/Admin/AdminOrderController.php`
- **Estados de Orden**:
  - `pending` → `pendiente_pago` → `pagado` → `en_espera_envio` → `enviado`
  - Estados especiales: `pago_rechazado`, `cancelado`

### 2.5 Módulo de Catálogos y Ofertas
- **Archivos clave**:
  - `app/Models/Catalog.php`
  - `app/Models/CatalogOffer.php`
  - `app/Http/Controllers/Api/AdminCatalogController.php`
- **Características**:
  - Catálogos con PDFs e imágenes agrupadas
  - Sistema de ofertas complejo (descuentos, buy-x-get-y, envío gratis)
  - Ofertas dirigidas a usuarios específicos
  - Ofertas por catálogo o globales

### 2.6 Módulo de Administración
- **Archivos clave**:
  - `resources/js/pages/AdminPanelPage.jsx`
  - `app/Http/Middleware/AdminMiddleware.php`
- **Funcionalidades**:
  - Gestión de usuarios, productos, catálogos, categorías
  - Dashboard con estadísticas de ventas
  - Gestión de órdenes y estados
  - Historial de sincronizaciones

## 3. FLUJOS CRÍTICOS

### 3.1 Flujo de Autenticación
```
1. POST /api/login
   → AuthController@login
   → Valida credenciales (email/teléfono)
   → Genera JWT token
   → Retorna user + token

2. Frontend almacena token en localStorage
3. Todas las peticiones incluyen: Authorization: Bearer {token}
4. Middleware auth:api valida token
5. Si expira, frontend redirige a /login
```

### 3.2 Flujo de Sincronización de Productos
```
1. Cronjob ejecuta: php artisan products:sync
   O GET /products/sync (sin auth, para cronjob externo)

2. ProductSyncController@sync:
   → Obtiene productos de API externa
   → Procesa cada producto:
     * Sincroniza Genero y Sector
     * Crea/actualiza Producto
     * Crea/actualiza Detalles (variantes de color/talla)
   → Registra en Historial
   → Retorna estadísticas

3. Frontend puede pre-cargar productos en cache
```

### 3.3 Flujo de Checkout y Pago
```
1. Usuario en carrito → POST /api/checkout/process
2. CheckoutController valida:
   - Dirección válida
   - Productos disponibles
   - Descuentos aplicables
   - Crédito disponible (si aplica)

3. Si pago con crédito:
   → Crea orden con status 'pagado' o 'pendiente_pago'
   → Descuenta crédito del usuario
   → Si hay saldo pendiente, crea preferencia MercadoPago

4. Si pago con MercadoPago:
   → Crea orden con status 'pending'
   → Crea preferencia en MercadoPago
   → Retorna URL de pago
   → Usuario redirige a MercadoPago

5. Webhook MercadoPago:
   → POST /api/mercadopago/webhook
   → Actualiza estado de orden según pago
   → Envía notificaciones

6. Admin gestiona:
   → Cambia estado a 'en_espera_envio'
   → Agrega tracking
   → Cambia a 'enviado'
```

### 3.4 Flujo de Ofertas y Descuentos
```
1. Usuario navega productos
2. Sistema calcula ofertas aplicables:
   - Ofertas de catálogo
   - Ofertas de usuario específico
   - Ofertas de categoría
   - Descuentos por volumen (20% >= 7000, 10% adicional >= 15000)

3. En checkout:
   → Aplica descuentos en orden
   → Calcula subtotal, discounted_total, shipping
   → Muestra resumen final

4. Ofertas especiales:
   - Buy X Get Y
   - Envío gratis (según monto mínimo)
   - Descuentos por categoría de vendedor (oro/bronce)
```

## 4. DEPENDENCIAS CRÍTICAS

### 4.1 Backend (PHP)
- `laravel/framework: ^12.0` - Framework principal
- `tymon/jwt-auth: ^2.2` - Autenticación JWT
- `mercadopago/dx-php: ^3.8` - Integración MercadoPago

### 4.2 Frontend (JavaScript)
- `react: ^19.1.0` - Librería UI
- `react-router-dom: ^7.6.3` - Routing
- `zustand: ^5.0.6` - Estado global
- `axios: ^1.10.0` - Cliente HTTP
- `@tanstack/react-query: ^5.81.5` - Cache y sincronización de datos

### 4.3 Servicios Externos
- **API Externa de Productos**: `https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos`
- **MercadoPago**: API de pagos (sandbox/production)
- **Base de Datos**: SQLite (dev) / MySQL (prod)

## 5. ÁREAS CRÍTICAS Y RIESGOS

### 5.1 Áreas Críticas

1. **Sincronización de Productos**
   - Proceso largo (puede tomar minutos)
   - Requiere manejo de memoria y timeout
   - Depende de API externa (punto único de fallo)

2. **Proceso de Pago**
   - Integración compleja con MercadoPago
   - Manejo de webhooks asíncronos
   - Estados de orden deben ser consistentes

3. **Sistema de Créditos**
   - Solo usuarios "oro" tienen crédito
   - Balance debe actualizarse correctamente
   - Órdenes con crédito parcial requieren lógica especial

4. **Cache de Productos**
   - Cache en memoria puede crecer mucho
   - Necesita invalidación correcta
   - Filtros complejos pueden ser lentos

### 5.2 Riesgos Técnicos

1. **Escalabilidad**
   - Cache en memoria no escala horizontalmente
   - Sincronización de productos bloqueante
   - Sin sistema de colas para procesos pesados

2. **Seguridad**
   - Tokens JWT en localStorage (vulnerable a XSS)
   - Ruta `/products/sync` sin autenticación (depende de IP/seguridad de red)
   - Validación de permisos inconsistente en algunos endpoints

3. **Mantenibilidad**
   - Muchos controladores con lógica de negocio mezclada
   - Algunos modelos con muchos campos (Producto tiene 100+ campos)
   - Frontend con muchos componentes sin documentación clara

4. **Deuda Técnica**
   - Archivos duplicados (`AdminCatalogOfferController_old.php`, `AdminCatalogOfferController_new.php`)
   - Lógica de filtros duplicada en múltiples páginas
   - Algunos componentes muy grandes (p. ej., `PaymentController.php` tiene 2400+ líneas)

### 5.3 Complejidades Arquitectónicas

1. **Doble Carrito**
   - Carrito en localStorage (frontend)
   - Carrito en base de datos (backend)
   - Requiere sincronización compleja

2. **Estados de Orden**
   - Múltiples estados legacy y nuevos
   - Transiciones de estado deben validarse
   - Estados de pago externos (MercadoPago) vs internos

3. **Sistema de Ofertas**
   - Múltiples tipos de ofertas
   - Cálculo de descuentos complejo
   - Ofertas dirigidas a usuarios/productos específicos

## 6. ARCHIVOS FUENTE CLAVE

### Backend
- `app/Http/Controllers/PaymentController.php` - Lógica de pagos y órdenes
- `app/Http/Controllers/Api/ProductSyncController.php` - Sincronización productos
- `app/Services/MercadoPagoService.php` - Servicio MercadoPago
- `app/Models/Producto.php` - Modelo principal de productos
- `app/Models/Order.php` - Modelo de órdenes
- `app/Console/Commands/SyncProductsCommand.php` - Comando Artisan sync

### Frontend
- `resources/js/App.jsx` - Componente raíz
- `resources/js/store/userStore.js` - Estado de usuario
- `resources/js/store/cartStore.js` - Estado de carrito
- `resources/js/api/cherryApi.js` - Cliente API principal
- `resources/js/pages/AdminPanelPage.jsx` - Panel de administración
- `resources/js/pages/CartDetailsPage.jsx` - Página de carrito

### Configuración
- `routes/api.php` - Rutas API
- `routes/web.php` - Rutas web (SPA)
- `config/services.php` - Configuración servicios externos
- `vite.config.js` - Configuración build frontend
