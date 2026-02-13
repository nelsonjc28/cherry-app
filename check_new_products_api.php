<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\Http;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔍 Consultando API externa para productos nuevos...\n\n";

try {
    // Consultar API externa
    $response = Http::get('https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos');
    
    if (!$response->successful()) {
        throw new Exception('Error al consultar la API externa: ' . $response->status());
    }
    
    $responseData = $response->json();
    
    // Verificar si los productos están dentro de una clave 'data' (igual que ProductSyncController)
    if (isset($responseData['data']) && is_array($responseData['data'])) {
        $products = $responseData['data'];
        echo "✅ Productos encontrados dentro de la clave 'data'\n";
    } elseif (is_array($responseData)) {
        $products = $responseData;
        echo "✅ Productos en el nivel raíz de la respuesta\n";
    } else {
        throw new Exception('La respuesta de la API no es un array válido. Tipo: ' . gettype($responseData));
    }
    
    // Filtrar elementos que no son productos válidos (deben ser arrays con id_articulo)
    $originalCount = count($products);
    $products = array_filter($products, function($product) {
        // Solo filtrar si NO es un array o si NO tiene id_articulo definido
        if (!is_array($product)) {
            return false;
        }
        // Verificar que tenga id_articulo y que no sea null
        return isset($product['id_articulo']) && $product['id_articulo'] !== null;
    });
    
    // Reindexar el array después de filtrar
    $products = array_values($products);
    $filteredCount = count($products);
    
    echo "📦 Productos filtrados: {$originalCount} originales -> {$filteredCount} válidos\n\n";
    
    // Mostrar estructura del primer producto para debugging
    if (count($products) > 0) {
        echo "📋 Estructura del primer producto:\n";
        $firstProduct = $products[0];
        echo json_encode($firstProduct, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";
    }
    
    echo "📦 Total de productos en la API: " . count($products) . "\n\n";
    
    // Calcular fecha límite (30 días atrás)
    $today = new DateTime();
    $today->setTime(0, 0, 0, 0);
    $thirtyDaysAgo = clone $today;
    $thirtyDaysAgo->modify('-30 days');
    $thirtyDaysAgo->setTime(0, 0, 0, 0);
    
    echo "📅 Fecha actual: " . $today->format('Y-m-d') . "\n";
    echo "📅 Fecha límite (30 días atrás): " . $thirtyDaysAgo->format('Y-m-d') . "\n\n";
    
    // Contadores
    $totalProducts = count($products);
    $withStock = 0;
    $withoutStock = 0;
    $withFechaAlta = 0;
    $withoutFechaAlta = 0;
    $opcNuevoS = 0;
    $fechaAltaWithin30Days = 0;
    $meetsBothConditions = 0;
    $meetsStockCondition = 0;
    $meetsFechaCondition = 0;
    
    // Productos que cumplen las condiciones
    $matchingProducts = [];
    
    foreach ($products as $product) {
        // Condición 1: Stock > 0
        // Según ProductSyncController, el campo de inventario puede venir como 'inventario' o 'stock'
        // También puede venir en los detalles como 'inventario_d'
        $inventario = isset($product['inventario']) ? (float) $product['inventario'] : 0;
        $stock = isset($product['stock']) ? (float) $product['stock'] : 0;
        
        // Si hay detalles, sumar inventario_d
        $totalStockFromDetails = 0;
        if (isset($product['detalles']) && is_array($product['detalles'])) {
            foreach ($product['detalles'] as $detalle) {
                if (isset($detalle['inventario_d'])) {
                    $totalStockFromDetails += (float) $detalle['inventario_d'];
                }
            }
        }
        
        // Usar el mayor entre inventario general y suma de detalles
        $totalStock = max($inventario, $stock, $totalStockFromDetails);
        
        if ($totalStock > 0) {
            $withStock++;
            $meetsStockCondition = true;
        } else {
            $withoutStock++;
            $meetsStockCondition = false;
        }
        
        // Condición 2: fecha_alta dentro de 30 días O opc_nuevo = 'S'
        $opcNuevo = isset($product['opc_nuevo']) ? $product['opc_nuevo'] : null;
        $isMarkedAsNew = ($opcNuevo === 'S');
        
        if ($isMarkedAsNew) {
            $opcNuevoS++;
        }
        
        // Según ProductSyncController, fecha_alta viene de 'fechaCompra' en la API externa
        $fechaAlta = isset($product['fechaCompra']) ? $product['fechaCompra'] : (isset($product['fecha_alta']) ? $product['fecha_alta'] : null);
        
        // Debug para el primer producto
        if ($meetsBothConditions === 0 && count($matchingProducts) === 0) {
            static $debugShown = false;
            if (!$debugShown) {
                echo "🔍 Debug primer producto:\n";
                echo "   ID: " . ($product['id_articulo'] ?? $product['id'] ?? 'N/A') . "\n";
                echo "   inventario: " . ($product['inventario'] ?? 'N/A') . "\n";
                echo "   stock: " . ($product['stock'] ?? 'N/A') . "\n";
                echo "   totalStock calculado: $totalStock\n";
                echo "   fechaCompra: " . ($product['fechaCompra'] ?? 'N/A') . "\n";
                echo "   fecha_alta: " . ($product['fecha_alta'] ?? 'N/A') . "\n";
                echo "   opc_nuevo: " . ($product['opc_nuevo'] ?? 'N/A') . "\n";
                echo "   detalles count: " . (isset($product['detalles']) && is_array($product['detalles']) ? count($product['detalles']) : 0) . "\n";
                $debugShown = true;
            }
        }
        
        $meetsFechaCondition = false;
        
        if ($isMarkedAsNew) {
            // Si tiene opc_nuevo = 'S', cumple la condición de fecha
            $meetsFechaCondition = true;
            $withFechaAlta++;
        } elseif ($fechaAlta) {
            $withFechaAlta++;
            try {
                // Parsear fecha
                if (is_string($fechaAlta)) {
                    // Intentar diferentes formatos
                    $fechaAltaDate = DateTime::createFromFormat('Y-m-d', $fechaAlta);
                    if (!$fechaAltaDate) {
                        $fechaAltaDate = DateTime::createFromFormat('Y/m/d', $fechaAlta);
                    }
                    if (!$fechaAltaDate) {
                        $fechaAltaDate = new DateTime($fechaAlta);
                    }
                } else {
                    $fechaAltaDate = new DateTime($fechaAlta);
                }
                
                $fechaAltaDate->setTime(0, 0, 0, 0);
                
                // Verificar si está dentro de los últimos 30 días
                if ($fechaAltaDate >= $thirtyDaysAgo && $fechaAltaDate <= $today) {
                    $fechaAltaWithin30Days++;
                    $meetsFechaCondition = true;
                }
            } catch (Exception $e) {
                // Fecha inválida, no cumple condición
            }
        } else {
            $withoutFechaAlta++;
        }
        
        // Verificar si cumple AMBAS condiciones
        if ($meetsStockCondition && $meetsFechaCondition) {
            $meetsBothConditions++;
            $matchingProducts[] = [
                'id' => $product['id_articulo'] ?? $product['id'] ?? 'N/A',
                'descripcion' => $product['descripcion'] ?? 'N/A',
                'inventario' => $totalStock,
                'opc_nuevo' => $opcNuevo ?? 'N',
                'fecha_alta' => $fechaAlta ?? 'N/A'
            ];
        }
    }
    
    // Mostrar resultados
    echo "═══════════════════════════════════════════════════════════\n";
    echo "📊 ESTADÍSTICAS DE FILTRO PARA MÓDULO \"NUEVOS\"\n";
    echo "═══════════════════════════════════════════════════════════\n\n";
    
    echo "📦 CONDICIÓN 1: Stock > 0\n";
    echo "   ✅ Con stock > 0: " . $withStock . " productos\n";
    echo "   ❌ Sin stock (stock = 0): " . $withoutStock . " productos\n\n";
    
    echo "📅 CONDICIÓN 2: fecha_alta <= 30 días O opc_nuevo = 'S'\n";
    echo "   ✅ Con opc_nuevo = 'S': " . $opcNuevoS . " productos\n";
    echo "   ✅ Con fecha_alta dentro de 30 días: " . $fechaAltaWithin30Days . " productos\n";
    echo "   📋 Con fecha_alta (cualquiera): " . $withFechaAlta . " productos\n";
    echo "   ❌ Sin fecha_alta: " . $withoutFechaAlta . " productos\n\n";
    
    echo "═══════════════════════════════════════════════════════════\n";
    echo "🎯 RESULTADO FINAL\n";
    echo "═══════════════════════════════════════════════════════════\n";
    echo "✅ Productos que cumplen AMBAS condiciones: " . $meetsBothConditions . "\n";
    echo "   (Stock > 0 AND (fecha_alta <= 30 días OR opc_nuevo = 'S'))\n\n";
    
    if ($meetsBothConditions > 0 && $meetsBothConditions <= 20) {
        echo "📋 Lista de productos que cumplen las condiciones:\n";
        echo "─────────────────────────────────────────────────────────\n";
        foreach ($matchingProducts as $index => $prod) {
            echo ($index + 1) . ". ID: " . $prod['id'] . "\n";
            echo "   Descripción: " . substr($prod['descripcion'], 0, 50) . (strlen($prod['descripcion']) > 50 ? '...' : '') . "\n";
            echo "   Stock: " . $prod['inventario'] . "\n";
            echo "   opc_nuevo: " . $prod['opc_nuevo'] . "\n";
            echo "   fecha_alta: " . $prod['fecha_alta'] . "\n";
            echo "\n";
        }
    } elseif ($meetsBothConditions > 20) {
        echo "📋 Mostrando primeros 20 productos que cumplen las condiciones:\n";
        echo "─────────────────────────────────────────────────────────\n";
        for ($i = 0; $i < min(20, count($matchingProducts)); $i++) {
            $prod = $matchingProducts[$i];
            echo ($i + 1) . ". ID: " . $prod['id'] . " | Stock: " . $prod['inventario'] . " | opc_nuevo: " . $prod['opc_nuevo'] . " | fecha: " . $prod['fecha_alta'] . "\n";
        }
        echo "\n... y " . ($meetsBothConditions - 20) . " productos más\n\n";
    }
    
    echo "═══════════════════════════════════════════════════════════\n";
    echo "✅ Script completado exitosamente\n";
    echo "═══════════════════════════════════════════════════════════\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
