<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\CategoryProduct;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    /**
     * Obtener todas las categorías activas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $categories = Category::active()
                ->ordered()
                ->select(['id', 'name', 'slug', 'code', 'description'])
                ->get();

            return response()->json([
                'success' => true,
                'categories' => $categories
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categorías: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener una categoría específica
     */
    public function show(Request $request, $slug): JsonResponse
    {
        try {
            $category = Category::where('slug', $slug)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'category' => $category
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos de una categoría específica
     */
    public function getCategoryProducts(Request $request, $slug): JsonResponse
    {
        try {
            $category = Category::where('slug', $slug)
                ->where('is_active', true)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            // Obtener productos de la categoría con orden
            $products = CategoryProduct::where('category_id', $category->id)
                ->orderBy('display_order', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $products
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos de la categoría: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos locales de una categoría por su ID
     * Busca productos en la tabla productos donde id_linea coincide con el code de la categoría
     */
    public function getLocalProductsByCategory(Request $request, $categoryId): JsonResponse
    {
        try {
            $category = Category::find($categoryId);

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Categoría no encontrada'
                ], 404);
            }

            // Si la categoría no tiene código, retornar vacío
            if (!$category->code) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'category' => $category,
                        'products' => []
                    ]
                ]);
            }

            // Cache key para esta categoría
            $cacheKey = 'category_products_' . $category->id . '_' . $category->code;
            
            // Intentar obtener del cache (10 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            // Usar Query Builder para mejor rendimiento - solo campos necesarios para ProductCard
            $productos = DB::table('productos')
                ->select([
                    'productos.id',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.descripcion',
                    'productos.imagen',
                    'productos.precio1',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.fecha_alta',
                    'productos.opc_nuevo',
                    'productos.marca',
                    'productos.inventario'
                ])
                ->where('productos.id_linea', $category->code)
                ->get();

            // Obtener IDs de productos para buscar colores y detalles
            $productIds = $productos->pluck('id')->toArray();
            
            // Obtener detalles completos para colores y tallas
            $detallesPorProducto = [];
            $coloresPorProducto = [];
            if (!empty($productIds)) {
                $detalles = DB::table('detalles')
                    ->select('producto_id', 'nombreColor', 'detalle')
                    ->whereIn('producto_id', $productIds)
                    ->whereNotNull('nombreColor')
                    ->where('nombreColor', '!=', '')
                    ->get();
                
                foreach ($detalles as $detalle) {
                    if (!isset($detallesPorProducto[$detalle->producto_id])) {
                        $detallesPorProducto[$detalle->producto_id] = [];
                        $coloresPorProducto[$detalle->producto_id] = [];
                    }
                    
                    // Agregar detalle completo
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle
                    ];
                    
                    // Agregar color único
                    if (!in_array($detalle->nombreColor, $coloresPorProducto[$detalle->producto_id])) {
                        $coloresPorProducto[$detalle->producto_id][] = $detalle->nombreColor;
                    }
                }
            }

            // Obtener ratings de todos los productos de una vez (solo aprobadas)
            // Sumar todas las estrellas y dividir entre el total de reseñas aprobadas
            $ratingsPorProducto = [];
            if (!empty($productIds)) {
                $reviews = DB::table('reviews')
                    ->select('product_id', 'rating')
                    ->whereIn('product_id', $productIds)
                    ->where('is_approved', true)
                    ->get();
                
                // Agrupar por producto y calcular promedio manualmente
                $ratingsGrouped = [];
                foreach ($reviews as $review) {
                    if (!isset($ratingsGrouped[$review->product_id])) {
                        $ratingsGrouped[$review->product_id] = [
                            'sum' => 0,
                            'count' => 0
                        ];
                    }
                    $ratingsGrouped[$review->product_id]['sum'] += (int) $review->rating;
                    $ratingsGrouped[$review->product_id]['count']++;
                }
                
                // Calcular promedio: suma de estrellas / total de reseñas
                foreach ($ratingsGrouped as $productId => $data) {
                    $average = $data['count'] > 0 ? ($data['sum'] / $data['count']) : 0;
                    $ratingsPorProducto[$productId] = [
                        'rating' => round($average, 2), // Promedio con 2 decimales para precisión
                        'count' => $data['count']
                    ];
                }
            }

            // Construir respuesta directamente sin map()
            $formattedProducts = [];
            $now = time();
            $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60); // 45 días en segundos
            
            foreach ($productos as $producto) {
                // Convertir precio correctamente (puede venir como string o decimal)
                $precio1Raw = $producto->precio1;
                $precio1 = 0;
                if (is_numeric($precio1Raw)) {
                    $precio1 = (float) $precio1Raw;
                } elseif (is_string($precio1Raw)) {
                    $precio1 = (float) str_replace(',', '', $precio1Raw);
                }
                
                // Calcular precio original y descuento
                // Si tiene desc_promo > 0, aplicar descuento (independientemente de opc_promo)
                // precio1 es el precio BASE/ORIGINAL, no el precio con descuento aplicado
                $descPromoValue = (float) ($producto->desc_promo ?? 0);
                $hasDiscount = $descPromoValue > 0;
                // Reducir 10% al descuento (mínimo 0)
                $discountPercentage = $hasDiscount ? max(0, $descPromoValue - 10) : 0;
                // El precio original es precio1 (ya que precio1 es el precio base)
                $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                // Calcular precio final con descuento reducido aplicado sobre precio1
                $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                    ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                    : $precio1;
                
                // Determinar si es nuevo (45 días)
                $isNew = false;
                if ($producto->opc_nuevo === 'S') {
                    $isNew = true;
                } elseif ($producto->fecha_alta) {
                    $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                    if ($fechaAltaTimestamp && $fechaAltaTimestamp > $fortyFiveDaysAgo) {
                        $isNew = true;
                    }
                }
                
                // Obtener colores y detalles del producto
                $colors = $coloresPorProducto[$producto->id] ?? [];
                $detalles = $detallesPorProducto[$producto->id] ?? [];
                
                // Obtener rating del producto
                $ratingData = $ratingsPorProducto[$producto->id] ?? ['rating' => 0, 'count' => 0];
                
                $formattedProducts[] = [
                    'id' => $producto->id,
                    'id_articulo' => $producto->id,
                    'id_linea' => $producto->id_linea,
                    'catalogoId' => $producto->catalogoId,
                    'title' => $producto->descripcion,
                    'descripcion' => $producto->descripcion,
                    'image' => $producto->imagen,
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
                    'marca' => $producto->marca,
                    'inventario' => (float) $producto->inventario,
                    'detalles' => $detalles, // Detalles completos para el frontend
                    'rating' => $ratingData['rating'],
                    'ratingCount' => $ratingData['count'],
                    'totalRatings' => $ratingData['count']
                ];
            }

            $response = [
                'success' => true,
                'data' => [
                    'category' => $category,
                    'products' => $formattedProducts
                ]
            ];
            
            // Guardar en cache por 10 minutos
            Cache::put($cacheKey, $response, 600);
            
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos locales: ' . $e->getMessage()
            ], 500);
        }
    }
} 