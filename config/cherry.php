<?php

return [

    /**
     * Catálogo remoto (PHP/cron, proxy). Mismo valor que usaba el front (sin depender de CORS).
     * Sin barra final: se añade en el proxy.
     */
    'catalog_api_upstream' => rtrim(env('CHERRY_CATALOG_API_UPSTREAM', 'https://cherryapi.estrategiadmgs.com.mx/cherryApi'), '/'),

    /**
     * Consulta informativa de descuentos por cliente (mismo id externo que ventas: DM + 5 dígitos).
     * Base sin barra final; se llama GET {base}/{DM00000}.
     * Si en .env CHERRY_CLIENTE_API_BASE= queda vacío, env() devuelve '' (no el default) — normalizamos aquí.
     */
    'cliente_api_base' => (function () {
        $u = (string) env('CHERRY_CLIENTE_API_BASE', 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/cliente');
        if ($u === '') {
            $u = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/cliente';
        }

        return rtrim($u, '/');
    })(),

    'orders_web_base' => rtrim(env('CHERRY_ORDERS_WEB_URL', 'https://cherrydev.789.com.mx'), '/'),

    /**
     * POST de pedidos a cherryapi …/venta. En local/pruebas usar CHERRY_EXTERNAL_SALES_API_ENABLED=false.
     */
    'external_sales_api_enabled' => filter_var(
        env('CHERRY_EXTERNAL_SALES_API_ENABLED', true),
        FILTER_VALIDATE_BOOLEAN
    ),

    /** URL absoluta del logo para correos (S3 o CDN). Si vacío: /icons/logo-cherry.png */
    'mail_logo_url' => env('CHERRY_MAIL_LOGO_URL'),

    /** Nombre en asuntos y pies de correo (no usar APP_NAME si queda "Laravel"). */
    'mail_brand_name' => env('CHERRY_MAIL_BRAND_NAME', 'Cherry Central'),

    /** Imagen hero (columna izquierda) del correo de confirmación de pedido; si vacío: /images/welcome-default.jpg */
    'mail_order_confirmation_hero_url' => env('CHERRY_MAIL_ORDER_CONFIRMATION_HERO_URL', ''),

    'social_facebook' => env('CHERRY_SOCIAL_FACEBOOK_URL', 'https://www.facebook.com/'),

    'social_instagram' => env('CHERRY_SOCIAL_INSTAGRAM_URL', 'https://www.instagram.com/'),

    /** WhatsApp o página de contacto para enlaces en correos (ej. https://wa.me/52...) */
    'social_whatsapp' => env('CHERRY_SOCIAL_WHATSAPP_URL', ''),

    'returns_policy_url' => env('CHERRY_RETURNS_POLICY_URL', 'https://cherrydev.789.com.mx'),

    /** Retiro en tienda: texto del correo de confirmación (sin envío a domicilio). */
    'pickup_store_address' => env(
        'CHERRY_PICKUP_STORE_ADDRESS',
        'José Ma. Izazaga 127 Piso 2, Col. Centro, México, CDMX, C.P. 06080'
    ),

    /** Líneas de horario (una por elemento). */
    'pickup_store_hours' => [
        'Lunes a Jueves: 9:00 am - 7:00 pm',
        'Viernes: 9:00 a 5:00 pm',
    ],

    /** Enlace “Ver en mapa”. Si vacío, se arma búsqueda en Google Maps con la dirección. */
    'pickup_map_url' => env('CHERRY_PICKUP_MAP_URL', ''),

    /** Enlace “Agendar cita” (Calendly, WhatsApp, etc.). Si vacío, se usa contacto del sitio. */
    'pickup_appointment_url' => env('CHERRY_PICKUP_APPOINTMENT_URL', ''),

    /** Token Bearer para webhook de búsqueda de Respond.io (GET/POST /api/respondio/search). */
    'respondio_secret_token' => env('RESPONDIO_SECRET_TOKEN'),

];
