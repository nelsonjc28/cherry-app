<?php

namespace App\Http\Controllers\Api;

use App\Support\CatalogOfferDate;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\OrderItem;
use App\Models\Producto;
use App\Support\ProductNewEvaluator;

class TopSellingController extends Controller
{
    /**
     * Obtener productos más vendidos desde las órdenes
     * Retorna un ranking de los 20 productos más vendidos usando la tabla productos
     * Formato idéntico al componente de búsqueda para mostrar ofertas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $limit = (int) $request->input('limit', 20);
            
            // Sin caché - siempre consultar datos frescos de la BD
            // 1. Consultar órdenes y obtener ranking de productos más vendidos
            // Buscar en todos los tiempos, no solo el mes actual
            $topProducts = DB::table('order_items')
                ->select(
                    'order_items.product_id',
                    DB::raw('SUM(order_items.quantity) as total_quantity')
                )
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.status', '!=', 'cancelled')
                ->whereNotNull('order_items.product_id')
                ->where('order_items.product_id', '>', 0) // Asegurar que no sea 0 o negativo
                ->groupBy('order_items.product_id')
                ->orderBy('total_quantity', 'desc')
                ->limit($limit)
                ->get();

            
            // Extraer IDs y normalizar a strings
            $topProductIds = [];
            foreach ($topProducts as $item) {
                $productId = trim((string) $item->product_id);
                if (!empty($productId) && $productId !== '0') {
                    $topProductIds[] = $productId;
                }
            }

            if (empty($topProductIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0,
                        'page' => 1,
                        'per_page' => 0,
                        'last_page' => 1
                    ]
                ]);
            }

            if (empty($topProductIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0,
                        'page' => 1,
                        'per_page' => 0,
                        'last_page' => 1
                    ]
                ]);
            }

            // 2. Obtener productos de la tabla productos usando los IDs del ranking
            // Obtener todos los productos y filtrar por IDs normalizados para evitar problemas de tipo
            $allProductosQuery = DB::table('productos')
                ->select([
                    'productos.id',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.descripcion',
                    'productos.imagen',
                    'productos.precio1',
                    'productos.opc_nuevo',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.fecha_alta',
                    'productos.fecha_compra',
                    'productos.marca',
                    'productos.inventario',
                    'productos.sku',
                    'productos.stock_received_count'
                ]);
            Producto::applyFechaAgotadoVisibilityToProductosQuery($allProductosQuery);
            $allProductos = $allProductosQuery->get();
            
            // Normalizar IDs eliminando ceros a la izquierda para comparación
            $normalizeId = function($id) {
                return ltrim(trim((string) $id), '0') ?: '0'; // Si queda vacío, retornar '0'
            };
            
            // Crear mapa de IDs normalizados del ranking
            $topProductIdsNormalized = [];
            foreach ($topProductIds as $productId) {
                $normalized = $normalizeId($productId);
                $topProductIdsNormalized[$normalized] = $productId; // Guardar el ID original
            }
            
            // Filtrar productos que coincidan con los IDs del ranking (comparación normalizada)
            $productos = $allProductos->filter(function($producto) use ($topProductIdsNormalized, $normalizeId) {
                $normalizedId = $normalizeId($producto->id);
                return isset($topProductIdsNormalized[$normalizedId]);
            });

            // Crear mapa de productos por ID normalizado
            $productosMap = [];
            foreach ($productos as $producto) {
                $normalizedId = $normalizeId($producto->id);
                $productosMap[$normalizedId] = $producto;
            }

            // Mantener el orden del ranking de ventas
            $productosOrdenados = [];
            $ranking = 1;
            foreach ($topProductIdsNormalized as $normalizedId => $originalProductId) {
                if (isset($productosMap[$normalizedId])) {
                    $producto = $productosMap[$normalizedId];
                    $producto->ranking = $ranking;
                    $productosOrdenados[] = $producto;
                    $ranking++;
                }
            }

            if (empty($productosOrdenados)) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0,
                        'page' => 1,
                        'per_page' => 0,
                        'last_page' => 1
                    ]
                ]);
            }

            // 3. Obtener detalles (colores y tallas) para todos los productos
            $productIds = collect($productosOrdenados)->pluck('id')->toArray();
            
            $detallesPorProducto = [];
            $coloresPorProducto = [];
            if (!empty($productIds)) {
                $detalles = DB::table('detalles')
                    ->select('producto_id', 'nombreColor', 'detalle', 'inventario_d')
                    ->whereIn('producto_id', $productIds)
                    ->whereNotNull('nombreColor')
                    ->where('nombreColor', '!=', '')
                    ->get();
                
                foreach ($detalles as $detalle) {
                    if (!isset($detallesPorProducto[$detalle->producto_id])) {
                        $detallesPorProducto[$detalle->producto_id] = [];
                        $coloresPorProducto[$detalle->producto_id] = [];
                    }
                    
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle,
                        'inventario_d' => (float) ($detalle->inventario_d ?? 0)
                    ];
                    
                    if (!in_array($detalle->nombreColor, $coloresPorProducto[$detalle->producto_id])) {
                        $coloresPorProducto[$detalle->producto_id][] = $detalle->nombreColor;
                    }
                }
            }

            // 4. Obtener ratings de todos los productos (solo aprobadas)
            $ratingsPorProducto = [];
            if (!empty($productIds)) {
                $reviews = DB::table('reviews')
                    ->select('product_id', DB::raw('AVG(rating) as avg_rating'), DB::raw('COUNT(*) as count'))
                    ->whereIn('product_id', $productIds)
                    ->where('is_approved', true)
                    ->groupBy('product_id')
                    ->get();
                
                foreach ($reviews as $review) {
                    $ratingsPorProducto[$review->product_id] = [
                        'rating' => round((float) $review->avg_rating, 2),
                        'count' => (int) $review->count
                    ];
                }
            }

            // 5. Formatear productos en el mismo formato que ProductSearchController
            $products = [];
            
            foreach ($productosOrdenados as $producto) {
                // Convertir precio correctamente
                $precio1Raw = $producto->precio1;
                $precio1 = 0;
                if (is_numeric($precio1Raw)) {
                    $precio1 = (float) $precio1Raw;
                } elseif (is_string($precio1Raw)) {
                    $precio1 = (float) str_replace(',', '', $precio1Raw);
                }
                
                // Calcular precio original y descuento (igual que ProductSearchController)
                $descPromoValue = (float) ($producto->desc_promo ?? 0);
                $hasDiscount = $descPromoValue > 0;
                // Reducir 10% al descuento (mínimo 0)
                $discountPercentage = $hasDiscount ? CatalogOfferDate::catalogRebajaPercent($descPromoValue, $request->user()) : 0;
                // El precio original es precio1 (ya que precio1 es el precio base)
                $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                // Calcular precio final con descuento reducido aplicado sobre precio1
                $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                    ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                    : $precio1;
                
                // Obtener colores y detalles del producto
                $colors = $coloresPorProducto[$producto->id] ?? [];
                $detalles = $detallesPorProducto[$producto->id] ?? [];
                $isNew = ProductNewEvaluator::isNewLikeNuevosPage(
                    $producto->fecha_compra ?? null,
                    (float) ($producto->inventario ?? 0),
                    $detalles
                );
                
                // Obtener rating del producto
                $ratingData = $ratingsPorProducto[$producto->id] ?? ['rating' => 0, 'count' => 0];
                
                // Generar URL de imagen desde S3
                $imageUrl = $this->getProductImageUrl($producto->id);
                
                // Formato idéntico a ProductSearchController
                $products[] = [
                    'id' => $producto->id,
                    'id_articulo' => $producto->id,
                    'id_linea' => $producto->id_linea,
                    'catalogoId' => $producto->catalogoId,
                    'title' => $producto->descripcion,
                    'descripcion' => $producto->descripcion,
                    'image' => $imageUrl,
                    'price' => $finalPrice, // Precio final con descuento reducido aplicado
                    'precio1' => $precio1, // Precio base original
                    'originalPrice' => $hasDiscount ? $originalPrice : null,
                    'discount' => $discountPercentage, // Descuento reducido (desc_promo - 10)
                    'colors' => $colors,
                    'colores' => $colors, // También como colores
                    'isNew' => $isNew,
                    'opc_nuevo' => $producto->opc_nuevo,
                    'opc_promo' => $producto->opc_promo,
                    'desc_promo' => $producto->desc_promo,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'fecha_compra' => ProductNewEvaluator::formatFechaCompraForApi($producto->fecha_compra ?? null),
                    'marca' => $producto->marca,
                    'inventario' => (float) $producto->inventario,
                    'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
                    'detalles' => $detalles, // Detalles completos para el frontend
                    'rating' => $ratingData['rating'],
                    'ratingCount' => $ratingData['count'],
                    'totalRatings' => $ratingData['count'],
                    'ranking' => $producto->ranking ?? null // Posición en el ranking de ventas
                ];
            }

            // 6. Respuesta en el mismo formato que ProductSearchController
            $response = [
                'success' => true,
                'data' => [
                    'products' => $products,
                    'total' => count($products),
                    'page' => 1,
                    'per_page' => count($products),
                    'last_page' => 1
                ]
            ];
            
            // Sin caché - siempre retornar datos frescos de la BD
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos más vendidos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generar URL de imagen del producto desde S3
     * @param string|int $productId - ID del producto
     * @return string URL de la imagen
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }

        // Convertir a string para manejar correctamente
        $productIdStr = trim((string) $productId);
        
        // Generar URL de S3: https://cherry-fotos.s3.amazonaws.com/shopify/{productId}/{productId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }
}
