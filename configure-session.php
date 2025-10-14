<?php

echo "🔧 Configurando sesión para durar 1 mes...\n\n";

// Verificar si existe el archivo .env
$envFile = __DIR__ . '/.env';
$envExists = file_exists($envFile);

if (!$envExists) {
    echo "❌ No se encontró el archivo .env\n";
    echo "📝 Creando archivo .env con configuraciones básicas...\n\n";
    
    // Contenido básico del .env
    $envContent = "APP_NAME=CherryApp
APP_ENV=local
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file

# Configuración de sesión para durar 1 mes (43800 minutos = 30.4 días)
SESSION_LIFETIME=43800
SESSION_EXPIRE_ON_CLOSE=false

# Configuración JWT para durar 1 mes (43800 minutos = 30.4 días)
JWT_SECRET=YOUR_JWT_SECRET_HERE
JWT_TTL=43800
JWT_REFRESH_TTL=43800

# MercadoPago Configuration
MP_TOKEN=TEST-127251550835057-092118-F0061234567890ABCDEF01234567890-43800
MP_key=TEST-7741f243-19e3-4020-b9b4-5f8e955ba892
MERCADOPAGO_CURRENCY_ID=ARS

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=\"hello@example.com\"
MAIL_FROM_NAME=\"\${APP_NAME}\"

# Ngrok URL (opcional, para webhooks de MercadoPago)
# NGROK_URL=https://your-ngrok-url.ngrok.io
";

    if (file_put_contents($envFile, $envContent)) {
        echo "✅ Archivo .env creado exitosamente\n\n";
    } else {
        echo "❌ Error al crear el archivo .env\n";
        exit(1);
    }
} else {
    echo "✅ Archivo .env encontrado\n\n";
}

// Verificar configuraciones actuales
echo "📋 Verificando configuraciones de sesión actuales:\n\n";

// Cargar Laravel para verificar configuraciones
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$sessionLifetime = config('session.lifetime');
$jwtTtl = config('jwt.ttl');
$jwtRefreshTtl = config('jwt.refresh_ttl');

echo "🕒 SESSION_LIFETIME: {$sessionLifetime} minutos (" . round($sessionLifetime / 60 / 24, 1) . " días)\n";
echo "🔐 JWT_TTL: {$jwtTtl} minutos (" . round($jwtTtl / 60 / 24, 1) . " días)\n";
echo "🔄 JWT_REFRESH_TTL: {$jwtRefreshTtl} minutos (" . round($jwtRefreshTtl / 60 / 24, 1) . " días)\n\n";

// Verificar si las configuraciones son correctas (1 mes = 43800 minutos)
$expectedLifetime = 43800;

if ($sessionLifetime == $expectedLifetime && $jwtTtl == $expectedLifetime && $jwtRefreshTtl == $expectedLifetime) {
    echo "✅ ¡Configuraciones correctas! La sesión durará aproximadamente 1 mes.\n\n";
    
    // Limpiar cache de configuración
    echo "🧹 Limpiando cache de configuración...\n";
    Artisan::call('config:clear');
    Artisan::call('cache:clear');
    
    echo "✅ Cache limpiado exitosamente\n\n";
    echo "🎉 ¡Configuración completada!\n";
    echo "📱 Los usuarios ahora podrán mantener su sesión activa por aproximadamente 1 mes.\n";
} else {
    echo "⚠️ Las configuraciones no coinciden con lo esperado.\n";
    echo "📝 Valores esperados:\n";
    echo "   - SESSION_LIFETIME: {$expectedLifetime} minutos\n";
    echo "   - JWT_TTL: {$expectedLifetime} minutos\n";
    echo "   - JWT_REFRESH_TTL: {$expectedLifetime} minutos\n\n";
    echo "🔧 Por favor, verifica el archivo .env y asegúrate de que contenga:\n";
    echo "   SESSION_LIFETIME={$expectedLifetime}\n";
    echo "   JWT_TTL={$expectedLifetime}\n";
    echo "   JWT_REFRESH_TTL={$expectedLifetime}\n";
}

echo "\n🔍 Nota: Si continúas teniendo problemas con la sesión, también verifica:\n";
echo "   - Que el frontend esté usando los intervalos correctos (24 horas)\n";
echo "   - Que el navegador no esté borrando el localStorage\n";
echo "   - Que no haya errores en la consola del navegador\n";





















