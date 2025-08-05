# Configuración de Email con Mandrill

## Configuración del .env

Asegúrate de tener las siguientes variables en tu archivo `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mandrillapp.com
MAIL_PORT=587
MAIL_USERNAME="noreply.cherry@789.com.mx"
MAIL_PASSWORD=md-KBGHjFEAtFhpHCMd4E_Ujg
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply.cherry@789.com.mx"
MAIL_FROM_NAME="${APP_NAME}"
```

## Verificación de la Configuración

Para verificar que todo esté configurado correctamente, ejecuta:

```bash
php artisan test:email tu-email@ejemplo.com
```

Este comando:
- Verifica que todas las variables de configuración estén presentes
- Intenta enviar un email de prueba
- Muestra información detallada sobre la configuración
- Registra logs de éxito o error

## Endpoint del Formulario de Contacto

El formulario de contacto está disponible en:

```
POST /api/contact/send
```

### Parámetros requeridos:
- `name`: Nombre del remitente (máximo 100 caracteres)
- `email`: Email del remitente (formato válido)
- `subject`: Asunto del mensaje (máximo 100 caracteres)
- `message`: Contenido del mensaje (máximo 2000 caracteres)

### Parámetros opcionales:
- `phone`: Teléfono del remitente (máximo 20 caracteres)

### Ejemplo de uso:

```javascript
fetch('/api/contact/send', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify({
        name: 'Juan Pérez',
        email: 'juan@ejemplo.com',
        phone: '123456789',
        subject: 'productos',
        message: 'Me interesa información sobre sus productos.'
    })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log('Mensaje enviado exitosamente');
    } else {
        console.error('Error:', data.message);
    }
});
```

## Configuración del Email de Destino

El sistema busca automáticamente el email de contacto configurado en la base de datos. Asegúrate de tener un registro en la tabla `contacts` con:

- `type`: 'email'
- `is_active`: true
- `value`: El email donde quieres recibir los mensajes

## Logs y Monitoreo

Todos los envíos de email se registran en los logs de Laravel. Puedes revisar:

- Logs de éxito: `storage/logs/laravel.log`
- Logs de error: `storage/logs/laravel.log`

## Solución de Problemas

### Error de Autenticación
- Verifica que las credenciales de Mandrill sean correctas
- Asegúrate de que el API key tenga permisos de envío

### Error de Conexión
- Verifica que el puerto 587 esté abierto
- Confirma que `MAIL_ENCRYPTION=tls` esté configurado

### Email no llega
- Revisa la carpeta de spam
- Verifica que el email de destino esté configurado correctamente en la base de datos
- Revisa los logs de Laravel para más detalles

## Plantilla de Email

La plantilla del email se encuentra en `resources/views/emails/contact-form.blade.php` y incluye:

- Diseño responsive
- Información del remitente
- Formato profesional
- Colores de la marca Cherry Central

## Comandos Útiles

```bash
# Probar envío de email
php artisan test:email tu-email@ejemplo.com

# Limpiar cache de configuración
php artisan config:clear

# Limpiar cache de rutas
php artisan route:clear
``` 