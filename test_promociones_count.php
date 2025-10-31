<?php
// Script para verificar cuántos productos con promociones hay en la API externa

$api_url = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

echo "🔍 Verificando productos con promociones en la API externa...\n\n";

try {
    $response = file_get_contents($api_url);
    $data = json_decode($response, true);
    
    if (!$data) {
        echo "❌ Error: No se pudo decodificar la respuesta JSON\n";
        exit;
    }
    
    $allProducts = [];
    if (is_array($data)) {
        $allProducts = $data;
    } else if (isset($data['productos']) && is_array($data['productos'])) {
        $allProducts = $data['productos'];
    }
    
    echo "📊 Total de productos en la API: " . count($allProducts) . "\n\n";
    
    // Filtrar productos con desc_promo > 0
    $promoProducts = array_filter($allProducts, function($product) {
        $hasPromoDiscount = isset($product['desc_promo']) && floatval($product['desc_promo']) > 0;
        $isWebEnabled = isset($product['opc_web']) && $product['opc_web'] === 'S';
        return $hasPromoDiscount && $isWebEnabled;
    });
    
    echo "🎯 Productos con desc_promo > 0 y opc_web = 'S': " . count($promoProducts) . "\n\n";
    
    // Si no hay productos con desc_promo, verificar opc_promo
    if (count($promoProducts) === 0) {
        $promoOptionProducts = array_filter($allProducts, function($product) {
            $hasPromoOption = isset($product['opc_promo']) && $product['opc_promo'] === 'S';
            $isWebEnabled = isset($product['opc_web']) && $product['opc_web'] === 'S';
            return $hasPromoOption && $isWebEnabled;
        });
        
        echo "🎯 Productos con opc_promo = 'S' y opc_web = 'S': " . count($promoOptionProducts) . "\n\n";
    }
    
    // Mostrar algunos ejemplos
    echo "📋 Ejemplos de productos con promociones:\n";
    $count = 0;
    foreach ($promoProducts as $product) {
        if ($count >= 5) break;
        
        echo "- ID: " . ($product['id_articulo'] ?? 'N/A') . 
             ", Nombre: " . ($product['descripcion'] ?? 'N/A') . 
             ", Descuento: " . ($product['desc_promo'] ?? 'N/A') . "%\n";
        $count++;
    }
    
    if (count($promoProducts) === 0) {
        echo "⚠️  No se encontraron productos con desc_promo > 0\n";
        echo "🔍 Verificando productos con opc_promo = 'S'...\n";
        
        $count = 0;
        foreach ($allProducts as $product) {
            if ($count >= 5) break;
            if (isset($product['opc_promo']) && $product['opc_promo'] === 'S') {
                echo "- ID: " . ($product['id_articulo'] ?? 'N/A') . 
                     ", Nombre: " . ($product['descripcion'] ?? 'N/A') . 
                     ", opc_promo: " . ($product['opc_promo'] ?? 'N/A') . 
                     ", desc_promo: " . ($product['desc_promo'] ?? 'N/A') . "\n";
                $count++;
            }
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>















