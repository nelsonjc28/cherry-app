# GUÍA PARA IA - PROYECTO CHERRY APP

Esta guía está diseñada para que cualquier IA pueda operar eficientemente dentro del proyecto Cherry App sin romper funcionalidades existentes.

---

## 1. ESTRUCTURA DEL PROYECTO

### 1.1. Backend (Laravel)
- **Ubicación**: `/app`
- **Controladores**: `/app/Http/Controllers/Api/`
- **Modelos**: `/app/Models/`
- **Migraciones**: `/database/migrations/`
- **Rutas**: `/routes/api.php`
- **Middleware**: `/app/Http/Middleware/`

### 1.2. Frontend (React)
- **Ubicación**: `/resources/js`
- **Componentes**: `/resources/js/components/`
- **Páginas**: `/resources/js/pages/`
- **Stores**: `/resources/js/store/`
- **API Clients**: `/resources/js/api/`
- **Utilidades**: `/resources/js/utils/`
- **Router**: `/resources/js/components/SimpleApp.jsx`

---

## 2. CÓMO LEER LA ESTRUCTURA

### 2.1. Identificar un Flujo Completo

**Ejemplo: Agregar producto al carrito**

1. **Frontend**: `CartPage.jsx` → `cartStore.js` → `api.js` (POST `/api/cart`)
2. **Backend**: `routes/api.php` → `CartController.php` → `Cart.php` (modelo)
3. **Base de datos**: Tablas `carts` y `cart_items`

**Pasos para entender:**
- Buscar el componente/página que inicia la acción
- Seguir el flujo hasta el store/API client
- Identificar la ruta API en `routes/api.php`
- Encontrar el controlador correspondiente
- Revisar el modelo y sus relaciones

### 2.2. Identificar Modelos y Relaciones

**Ejemplo: Producto**

1. Buscar modelo: `app/Models/Producto.php`
2. Revisar `$fillable` para campos editables
3. Buscar relaciones: `hasMany`, `belongsTo`, `belongsToMany`
4. Revisar migración: `database/migrations/*_create_productos_table.php`
5. Buscar controladores que usan el modelo: `grep -r "Producto" app/Http/Controllers/`

### 2.3. Identificar Rutas API

1. Abrir `routes/api.php`
2. Buscar el endpoint (ej: `/api/products/new`)
3. Identificar controlador y método
4. Revisar middleware aplicado (`auth:api`, `admin`)
5. Abrir el controlador y revisar el método

---

## 3. CÓMO MODIFICAR ARCHIVOS SIN ROMPER NADA

### 3.1. Reglas de Oro

1. **NUNCA modificar migraciones existentes** (crear nuevas si es necesario)
2. **SIEMPRE revisar relaciones Eloquent** antes de modificar modelos
3. **VALIDAR inputs** tanto en frontend como backend
4. **MANTENER compatibilidad** con estructura de datos existente
5. **PROBAR** que las relaciones funcionen después de cambios

### 3.2. Modificar Modelos

**ANTES de modificar un modelo:**
- ✅ Revisar `$fillable` y `$casts`
- ✅ Revisar relaciones (`hasMany`, `belongsTo`, etc.)
- ✅ Revisar migración para entender estructura de BD
- ✅ Buscar todos los lugares donde se usa el modelo

**AL modificar:**
- ✅ Agregar campos a `$fillable` si son mass-assignable
- ✅ Agregar casts si son necesarios
- ✅ Actualizar relaciones si cambia estructura
- ✅ Crear migración para cambios en BD

**DESPUÉS de modificar:**
- ✅ Verificar que controladores que usan el modelo sigan funcionando
- ✅ Verificar que relaciones funcionen correctamente
- ✅ Probar queries comunes

### 3.3. Modificar Controladores

**ANTES de modificar:**
- ✅ Revisar ruta en `routes/api.php`
- ✅ Revisar middleware aplicado
- ✅ Revisar validación de inputs
- ✅ Revisar respuesta JSON esperada por frontend

**AL modificar:**
- ✅ Mantener estructura de respuesta JSON consistente
- ✅ Validar todos los inputs
- ✅ Manejar errores apropiadamente
- ✅ Usar transacciones DB si es necesario

**DESPUÉS de modificar:**
- ✅ Verificar que frontend reciba datos en formato esperado
- ✅ Probar casos de error
- ✅ Verificar autenticación/autorización

### 3.4. Modificar Componentes React

**ANTES de modificar:**
- ✅ Revisar props que recibe el componente
- ✅ Revisar estado local y global (Zustand)
- ✅ Revisar llamadas API que hace
- ✅ Revisar rutas que usa (`react-router-dom`)

**AL modificar:**
- ✅ Mantener props interface consistente
- ✅ No romper estado compartido (Zustand stores)
- ✅ Mantener estructura de datos esperada por API
- ✅ Manejar estados de carga y error

**DESPUÉS de modificar:**
- ✅ Verificar que el componente se renderiza correctamente
- ✅ Verificar que las acciones funcionan
- ✅ Verificar que no rompe otros componentes que lo usan

### 3.5. Modificar Stores (Zustand)

**ANTES de modificar:**
- ✅ Revisar todos los componentes que usan el store
- ✅ Revisar estructura de estado actual
- ✅ Revisar acciones disponibles

**AL modificar:**
- ✅ Mantener estructura de estado compatible
- ✅ No eliminar acciones usadas por otros componentes
- ✅ Agregar nuevas acciones sin romper existentes

**DESPUÉS de modificar:**
- ✅ Verificar que componentes que usan el store siguen funcionando
- ✅ Probar todas las acciones

---

## 4. PRECAUCIONES Y CONVENCIONES

### 4.1. Autenticación

- **SIEMPRE** usar middleware `auth:api` en rutas que requieren autenticación
- **NUNCA** exponer información sensible sin verificar token JWT
- **SIEMPRE** verificar `user_id` en operaciones que modifican datos del usuario
- **RECORDAR**: Tokens JWT se almacenan en `localStorage` (vulnerable a XSS)

### 4.2. Validación

- **SIEMPRE** validar inputs en backend (Laravel validation)
- **SIEMPRE** validar inputs en frontend (antes de enviar)
- **NUNCA** confiar solo en validación frontend
- **USAR** reglas de validación consistentes

### 4.3. Base de Datos

- **NUNCA** modificar migraciones existentes (crear nuevas)
- **SIEMPRE** usar transacciones para operaciones críticas
- **SIEMPRE** manejar errores de BD apropiadamente
- **REVISAR** índices antes de agregar queries complejas

### 4.4. Productos

- **RECORDAR**: `Producto.id` es string (no integer)
- **RECORDAR**: Stock se calcula sumando `inventario_d` de `Detalle`
- **RECORDAR**: Productos "próximamente" tienen lógica especial
- **RECORDAR**: `fecha_alta` null = producto próximamente
- **RECORDAR**: Productos nuevos = `fecha_alta` dentro de 30 días O `opc_nuevo = 'S'`

### 4.5. Imágenes

- **RECORDAR**: URLs S3 se generan dinámicamente
- **FORMATO**: `https://cherry-fotos.s3.amazonaws.com/shopify/{id}/{id}_{number}.jpg`
- **USAR**: `productImageUtils.js` para generar URLs
- **MANEJAR**: Placeholder si imagen no existe

### 4.6. Ofertas y Descuentos

- **TIPOS**: porcentaje, buy_x_get_y, order_discount, free_shipping
- **APLICACIÓN**: CatalogOffer (por catálogo) y UserOffer (por usuario)
- **CALCULAR**: Precio final considerando todas las ofertas aplicables
- **VERIFICAR**: Que ofertas no se apliquen a productos "próximamente"

### 4.7. Carrito y Pedidos

- **RECORDAR**: Carrito se persiste en BD (no solo localStorage)
- **RECORDAR**: Sincronizar carrito entre dispositivos
- **RECORDAR**: Validar stock antes de crear pedido
- **RECORDAR**: Actualizar stock después de crear pedido

### 4.8. MercadoPago

- **RECORDAR**: Crear preferencia antes de redirigir a pago
- **RECORDAR**: Manejar webhooks para actualizar estado de pago
- **RECORDAR**: Validar firma de webhook
- **RECORDAR**: Actualizar orden después de pago exitoso

---

## 5. PATRONES COMUNES

### 5.1. Crear Nueva Ruta API

```php
// routes/api.php
Route::get('/api/nueva-ruta', [NuevoController::class, 'metodo'])->middleware('auth:api');
```

```php
// app/Http/Controllers/Api/NuevoController.php
public function metodo(Request $request) {
    // Validar
    $validated = $request->validate([...]);
    
    // Lógica
    $resultado = ...;
    
    // Responder
    return response()->json(['success' => true, 'data' => $resultado]);
}
```

### 5.2. Crear Nuevo Componente React

```jsx
// resources/js/components/NuevoComponent/NuevoComponent.jsx
import React from 'react';
import { useCartStore } from '../../store/cartStore';
import api from '../../services/api';

const NuevoComponent = ({ prop1, prop2 }) => {
    const { items } = useCartStore();
    
    const handleAction = async () => {
        try {
            const response = await api.post('/api/nueva-ruta', { data });
            // Manejar respuesta
        } catch (error) {
            // Manejar error
        }
    };
    
    return (
        <div>
            {/* JSX */}
        </div>
    );
};

export default NuevoComponent;
```

### 5.3. Crear Nueva Migración

```bash
php artisan make:migration nombre_de_la_migracion
```

```php
// database/migrations/YYYY_MM_DD_HHMMSS_nombre_de_la_migracion.php
public function up(): void {
    Schema::table('tabla', function (Blueprint $table) {
        $table->string('nuevo_campo')->nullable();
    });
}

public function down(): void {
    Schema::table('tabla', function (Blueprint $table) {
        $table->dropColumn('nuevo_campo');
    });
}
```

### 5.4. Agregar Relación a Modelo

```php
// app/Models/Producto.php
public function nuevasRelaciones() {
    return $this->hasMany(NuevoModelo::class, 'producto_id');
}
```

---

## 6. DEBUGGING

### 6.1. Backend

- **Logs**: `storage/logs/laravel.log`
- **Tinker**: `php artisan tinker` para probar queries
- **Debug**: Usar `dd()`, `dump()`, `Log::info()`

### 6.2. Frontend

- **Console**: Revisar consola del navegador
- **React DevTools**: Inspeccionar componentes y estado
- **Network**: Revisar peticiones HTTP en DevTools

### 6.3. Base de Datos

- **Queries**: Activar query logging en Laravel
- **Tinker**: `Producto::where(...)->get()`
- **MySQL**: Conectarse directamente para debugging

---

## 7. CHECKLIST ANTES DE HACER CAMBIOS

- [ ] ¿Entiendo la estructura actual del código?
- [ ] ¿He revisado todos los lugares donde se usa el código que voy a modificar?
- [ ] ¿He revisado las relaciones de base de datos?
- [ ] ¿He revisado las validaciones existentes?
- [ ] ¿He revisado la estructura de respuesta JSON esperada?
- [ ] ¿He considerado casos de error?
- [ ] ¿He considerado compatibilidad hacia atrás?
- [ ] ¿He probado los cambios localmente?

---

## 8. ERRORES COMUNES A EVITAR

1. **Modificar migraciones existentes** → Crear nuevas migraciones
2. **Cambiar estructura de respuesta JSON** → Mantener compatibilidad
3. **Eliminar campos de `$fillable`** → Verificar que no se usen
4. **Cambiar nombres de rutas API** → Verificar que frontend no las use
5. **Modificar estructura de estado en Zustand** → Verificar componentes que lo usan
6. **Hardcodear valores** → Usar variables de entorno o constantes
7. **No validar inputs** → Validar siempre en backend
8. **No manejar errores** → Manejar todos los casos de error
9. **Asumir que datos existen** → Verificar existencia antes de usar
10. **No probar después de cambios** → Probar siempre

---

## 9. RECURSOS ÚTILES

- **Laravel Docs**: https://laravel.com/docs
- **React Docs**: https://react.dev
- **Zustand Docs**: https://zustand-demo.pmnd.rs
- **React Router Docs**: https://reactrouter.com
- **MercadoPago Docs**: https://www.mercadopago.com.mx/developers

---

## 10. CONTACTO Y SOPORTE

Si encuentras problemas o necesitas clarificación:
1. Revisar esta guía primero
2. Revisar `ARQUITECTURA_PROYECTO.md`
3. Revisar código existente para patrones similares
4. Consultar documentación oficial de frameworks/librerías
