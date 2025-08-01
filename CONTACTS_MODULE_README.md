# Módulo de Gestión de Contactos - Cherry Central

## Descripción

Este módulo permite gestionar toda la información de contacto que se muestra en el sitio web. Los administradores pueden agregar, editar, eliminar y ordenar los diferentes métodos de contacto (teléfono, email, WhatsApp, dirección, etc.).

## Características

### Backend (Laravel)

#### Modelo Contact
- **Campos**: type, title, value, description, icon, is_active, order
- **Tipos soportados**: phone, email, whatsapp, address, social
- **Scopes**: active(), ordered(), getActiveContacts()

#### Controladores
1. **AdminContactController**: Gestión completa CRUD para administradores
2. **ContactController**: API pública para obtener contactos activos
3. **ContactFormController**: Manejo del formulario de contacto

#### Rutas API
- `GET /api/contacts` - Obtener contactos activos (público)
- `POST /api/contact-form` - Enviar formulario de contacto (público)
- `GET /api/admin/contacts` - Listar todos los contactos (admin)
- `POST /api/admin/contacts` - Crear contacto (admin)
- `PUT /api/admin/contacts/{id}` - Actualizar contacto (admin)
- `DELETE /api/admin/contacts/{id}` - Eliminar contacto (admin)
- `PATCH /api/admin/contacts/{id}/toggle` - Cambiar estado (admin)
- `POST /api/admin/contacts/update-order` - Actualizar orden (admin)

### Frontend (React)

#### Componentes
1. **AdminContactManager**: Panel de administración completo
2. **ContactoPage**: Página pública de contacto actualizada

#### Funcionalidades del Admin
- ✅ Crear nuevos contactos
- ✅ Editar contactos existentes
- ✅ Eliminar contactos
- ✅ Activar/desactivar contactos
- ✅ Cambiar orden de aparición
- ✅ Validación de formularios
- ✅ Mensajes de confirmación

#### Funcionalidades del Frontend
- ✅ Carga dinámica de contactos desde API
- ✅ Formulario de contacto funcional
- ✅ Envío de emails automático
- ✅ Estados de carga y error
- ✅ Validación de formularios

## Configuración de Email

### Para Desarrollo
```env
MAIL_MAILER=log
```
Los emails se guardan en `storage/logs/laravel.log`

### Para Producción
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD=tu-contraseña-de-aplicación
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tu-email@gmail.com
MAIL_FROM_NAME="Cherry Central"
```

## Uso

### 1. Configurar Contactos en el Admin
1. Accede al panel de administración
2. Ve a "Gestionar Contactos"
3. Agrega los diferentes métodos de contacto:
   - **Teléfono**: Número de contacto
   - **Email**: Email de contacto (se usa para recibir formularios)
   - **WhatsApp**: Número de WhatsApp
   - **Dirección**: Dirección física
   - **Red Social**: Enlaces a redes sociales

### 2. Configurar Email de Destino
El formulario de contacto enviará emails automáticamente al primer email configurado en el admin. Asegúrate de:
1. Tener al menos un contacto de tipo "email" configurado
2. Que el contacto esté activo
3. Configurar correctamente el servidor de email

### 3. Personalizar Plantilla de Email
La plantilla se encuentra en `resources/views/emails/contact-form.blade.php` y puede ser personalizada según tus necesidades.

## Datos de Ejemplo

El seeder `ContactSeeder` incluye datos de ejemplo:
- Teléfono principal
- WhatsApp
- Email de contacto
- Dirección
- Teléfono de oficina
- Email oficial

## Estructura de Base de Datos

```sql
CREATE TABLE contacts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT NULL,
    icon VARCHAR(100) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    order INTEGER DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

## Logs y Monitoreo

- Los emails enviados se registran en `storage/logs/laravel.log`
- Los errores de envío se capturan y registran automáticamente
- Se pueden agregar notificaciones adicionales según necesidades

## Seguridad

- Validación de datos en frontend y backend
- Sanitización de inputs
- Protección CSRF automática
- Logs de auditoría para emails enviados
- Rate limiting recomendado para el endpoint de formulario

## Próximas Mejoras

- [ ] Notificaciones push para nuevos mensajes
- [ ] Respuestas automáticas al remitente
- [ ] Filtros y búsqueda en el admin
- [ ] Exportación de mensajes de contacto
- [ ] Integración con CRM
- [ ] Plantillas de email personalizables desde el admin 