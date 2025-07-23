<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\WelcomeSection;

echo "=== Prueba de Actualización de URL e Imagen ===\n\n";

try {
    $section = WelcomeSection::first();
    
    if (!$section) {
        echo "❌ No hay secciones para probar.\n";
        exit;
    }
    
    echo "✅ Sección encontrada:\n";
    echo "- ID: {$section->id}\n";
    echo "- Título: {$section->title}\n";
    echo "- URL del botón: {$section->button_url}\n";
    echo "- Imagen: {$section->image_path}\n\n";
    
    // Probar actualización de URL
    $newUrl = "/test-url-" . time();
    echo "🔄 Actualizando URL del botón a: {$newUrl}\n";
    
    $result = $section->update(['button_url' => $newUrl]);
    echo "Resultado update URL: " . ($result ? 'true' : 'false') . "\n";
    
    $section->refresh();
    echo "URL después: {$section->button_url}\n\n";
    
    // Revertir URL
    $originalUrl = "/catalogo";
    $section->update(['button_url' => $originalUrl]);
    echo "✅ URL revertida a: {$section->button_url}\n\n";
    
    // Probar actualización de imagen (solo el path)
    $newImagePath = "welcome-sections/test-image-" . time() . ".jpg";
    echo "🔄 Actualizando imagen a: {$newImagePath}\n";
    
    $result = $section->update(['image_path' => $newImagePath]);
    echo "Resultado update imagen: " . ($result ? 'true' : 'false') . "\n";
    
    $section->refresh();
    echo "Imagen después: {$section->image_path}\n\n";
    
    // Revertir imagen
    $originalImagePath = "welcome-sections/default-welcome.jpg";
    $section->update(['image_path' => $originalImagePath]);
    echo "✅ Imagen revertida a: {$section->image_path}\n\n";
    
    echo "🎯 Prueba completada exitosamente!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

echo "\n=== Fin de la prueba ===\n"; 