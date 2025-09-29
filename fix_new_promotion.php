<?php
// Script para agregar productos actuales a la nueva promoción

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Configurar Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "🔧 Agregando productos a la nueva promoción...\n\n";
    
    // Productos que aparecen en las promociones según los logs anteriores
    $promoProducts = [
        '6253318714', '6251406301', '9752157104', '9752123906', '07522532412',
        '07522595501', '07542576903', '07522573803', '07522520304', '50511253615',
        '07512570903', '415138010105', '9752157901', '2844873109', '49535025203',
        '07512540606', '07512540806', '183119278306', '183119278906', '183119278706'
    ];
    
    // Usar la nueva oferta "test" (ID 15) con 10% descuento
    $newOfferId = 15;
    
    echo "📦 Agregando productos a la oferta ID {$newOfferId} (test - 10%)...\n\n";
    
    $added = 0;
    foreach ($promoProducts as $productId) {
        // Verificar si ya existe
        $exists = DB::table('catalog_offer_products')
            ->where('offer_id', $newOfferId)
            ->where('product_id', $productId)
            ->exists();
        
        if (!$exists) {
            DB::table('catalog_offer_products')->insert([
                'offer_id' => $newOfferId,
                'product_id' => $productId,
                'created_at' => now(),
                'updated_at' => now()
            ]);
            echo "✅ Agregado: {$productId}\n";
            $added++;
        } else {
            echo "⚠️ Ya existe: {$productId}\n";
        }
    }
    
    echo "\n🎉 Se agregaron {$added} productos nuevos a la promoción.\n";
    
    // Verificar el resultado final
    $finalCount = DB::table('catalog_offer_products')
        ->where('offer_id', $newOfferId)
        ->count();
    
    echo "\n📊 Total de productos en la nueva promoción: {$finalCount}\n";
    
    // Verificar total de productos del usuario
    $totalUserProducts = DB::table('catalog_offer_products')
        ->join('catalog_offers', 'catalog_offer_products.offer_id', '=', 'catalog_offers.id')
        ->join('catalog_offer_users', 'catalog_offers.id', '=', 'catalog_offer_users.offer_id')
        ->where('catalog_offer_users.user_id', 2) // cliente@cherrycentral.com
        ->where('catalog_offers.is_active', true)
        ->where('catalog_offers.start_date', '<=', now())
        ->where('catalog_offers.end_date', '>=', now())
        ->count();
    
    echo "🎯 Total de productos con ofertas del usuario: {$totalUserProducts}\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

