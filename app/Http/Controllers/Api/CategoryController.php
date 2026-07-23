<?php

namespace App\Http\Controllers\Api;

use App\Support\CatalogOfferDate;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Support\ProductNewEvaluator;
use App\Support\ProductStatusEvaluator;
use App\Models\Producto;
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
            // Obtener todas las categorías activas
            $categories = Category::active()
                ->ordered()
                ->select(['id', 'name', 'slug', 'code', 'description'])
                ->get();

            // Log para debugging
            \Log::info('Categorías obtenidas desde CategoryController', [
                'count' => $categories->count(),
                'total_categories' => Category::count(),
                'active_categories' => Category::where('is_active', true)->count(),
                'categories' => $categories->map(fn($cat) => [
                    'id' => $cat->id, 
                    'name' => $cat->name, 
                    'code' => $cat->code,
                    'is_active' => $cat->is_active
                ])->toArray()
            ]);

            // Si no hay categorías activas, devolver array vacío pero con success: true
            return response()->json([
                'success' => true,
                'categories' => $categories,
                'count' => $categories->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Error al obtener categorías', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categorías: ' . $e->getMessage(),
                'categories' => []
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
            // Sin caché - siempre obtener datos frescos de la BD
            // Usar Query Builder para mejor rendimiento - solo campos necesarios para ProductCard
            $productosQuery = DB::table('productos')
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
                    'productos.fecha_compra',
                    'productos.opc_nuevo',
                    'productos.marca',
                    'productos.inventario',
                    'productos.stock_received_count'
                ])
                ->whereRaw('CAST(productos.id_linea AS UNSIGNED) = CAST(? AS UNSIGNED)', [$category->code]);
            Producto::applyFechaAgotadoVisibilityToProductosQuery($productosQuery);
            $productos = $productosQuery->inRandomOrder()->get();

            // Obtener IDs de productos para buscar colores y detalles
            $productIds = $productos->pluck('id')->toArray();
            
            // Obtener detalles completos para colores y tallas
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
                    
                    // Agregar detalle completo
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle,
                        'inventario_d' => (float) ($detalle->inventario_d ?? 0),
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

                // Filtro principal unificado (Próximamente / Nuevo / Agotado / En Rebaja).
                // Calculamos el inventario total alineado con el frontend:
                //  - si hay detalles, suma de inventario_d (positivos);
                //  - en su defecto, inventario de cabecera.
                $inventarioSumDetalles = 0.0;
                foreach ($detalles as $d) {
                    $inv = (float) ($d['inventario_d'] ?? 0);
                    if ($inv > 0.0000001) {
                        $inventarioSumDetalles += $inv;
                    }
                }
                $headerInv = (float) ($producto->inventario ?? 0);
                $inventarioTotalProducto = $inventarioSumDetalles > 0.00001
                    ? $inventarioSumDetalles
                    : ($headerInv > 0.0000001 ? $headerInv : 0.0);

                $statusEval = ProductStatusEvaluator::evaluate(
                    (array) $producto,
                    $inventarioTotalProducto,
                    $detalles
                );

                // Mantener también isNew por compat con consumidores existentes del campo.
                $isNew = $statusEval['is_new'];

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

                    // Filtro principal unificado (ProductoStatusEvaluator)
                    'status' => $statusEval['status'],
                    'stock_kind' => $statusEval['status'],
                    'isNew' => $isNew,
                    'is_in_stock' => $statusEval['is_in_stock'],
                    'is_coming_soon' => $statusEval['is_coming_soon'],
                    'is_out_of_stock' => $statusEval['is_out_of_stock'],
                    'is_on_sale' => $statusEval['is_on_sale'],

                    'opc_nuevo' => $producto->opc_nuevo,
                    'opc_promo' => $producto->opc_promo,
                    'desc_promo' => $producto->desc_promo,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'fecha_compra' => ProductNewEvaluator::formatFechaCompraForApi($producto->fecha_compra ?? null),
                    'marca' => $producto->marca,
                    'inventario' => $inventarioTotalProducto,
                    'stock' => $inventarioTotalProducto,
                    'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
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
            
            // Sin caché - siempre retornar datos frescos de la BD
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos locales: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener categorías disponibles basadas en productos locales con ofertas
     * Devuelve categorías únicas de productos que tienen desc_promo > 0 o están en ofertas personalizadas
     */
    public function getAvailableCategoriesFromLocalProducts(Request $request): JsonResponse
    {
        try {
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();
            // Sin caché - siempre obtener datos frescos de la BD
            // 1. Obtener productos con desc_promo > 0
            $productsWithGeneralDiscountQuery = DB::table('productos')
                ->select('productos.id', 'productos.id_linea')
                ->where('productos.desc_promo', '>', 0)
                ->whereNotNull('productos.id_linea')
                ->where('productos.id_linea', '!=', '')
                ->distinct();
            Producto::applyFechaAgotadoVisibilityToProductosQuery($productsWithGeneralDiscountQuery);
            $productsWithGeneralDiscount = $productsWithGeneralDiscountQuery->get();

            // 2. Obtener productos con ofertas personalizadas para el usuario logueado
            $productsWithUserOffers = collect([]);
            if ($userId) {
                $productsWithUserOffers = DB::table('catalog_offer_products')
                    ->select('product_id')
                    ->join('catalog_offers', 'catalog_offer_products.offer_id', '=', 'catalog_offers.id')
                    ->join('catalog_offer_users', 'catalog_offers.id', '=', 'catalog_offer_users.offer_id')
                    ->where('catalog_offer_users.user_id', $userId)
                    ->where('catalog_offers.is_active', true)
                    ->whereDate('catalog_offers.start_date', '<=', now()->toDateString())
                    ->whereDate('catalog_offers.end_date', '>=', now()->toDateString())
                    ->distinct()
                    ->pluck('product_id');
            }

            // Combinar IDs únicos de ambos tipos de ofertas
            $allOfferProductIds = $productsWithGeneralDiscount->pluck('id')->toArray();
            if ($productsWithUserOffers->isNotEmpty()) {
                $allOfferProductIds = array_unique(array_merge($allOfferProductIds, $productsWithUserOffers->toArray()));
            }

            // Obtener id_linea únicos de productos con ofertas
            $uniqueIdLineas = [];
            if (!empty($allOfferProductIds)) {
                $uniqueIdLineasQuery = DB::table('productos')
                    ->select('productos.id_linea')
                    ->whereIn('productos.id', $allOfferProductIds)
                    ->whereNotNull('productos.id_linea')
                    ->where('productos.id_linea', '!=', '')
                    ->distinct();
                Producto::applyFechaAgotadoVisibilityToProductosQuery($uniqueIdLineasQuery);
                $uniqueIdLineas = $uniqueIdLineasQuery->pluck('id_linea')->toArray();
            }

            // También obtener id_linea de productos con desc_promo > 0 directamente
            $idLineasFromDiscountQuery = DB::table('productos')
                ->select('productos.id_linea')
                ->where('productos.desc_promo', '>', 0)
                ->whereNotNull('productos.id_linea')
                ->where('productos.id_linea', '!=', '')
                ->distinct();
            Producto::applyFechaAgotadoVisibilityToProductosQuery($idLineasFromDiscountQuery);
            $idLineasFromDiscount = $idLineasFromDiscountQuery->pluck('id_linea')->toArray();

            // Combinar y obtener únicos
            $allIdLineas = array_unique(array_merge($uniqueIdLineas, $idLineasFromDiscount));

            // Obtener información de categorías desde la tabla categories donde code coincide con id_linea
            $categories = [];
            if (!empty($allIdLineas)) {
                $categories = Category::whereIn('code', $allIdLineas)
                    ->where('is_active', true)
                    ->select(['id', 'name', 'slug', 'code', 'description'])
                    ->orderBy('name', 'asc')
                    ->get()
                    ->map(function ($category) {
                        return [
                            'code' => $category->code,
                            'name' => $category->name
                        ];
                    })
                    ->toArray();
            }

            // Si no hay categorías en la tabla categories, crear categorías basadas en id_linea únicos
            if (empty($categories) && !empty($allIdLineas)) {
                // Obtener nombres de categorías desde productos (si tienen línea con descripción)
                $lineasInfo = DB::table('productos')
                    ->select('id_linea')
                    ->whereIn('id_linea', $allIdLineas)
                    ->distinct()
                    ->get();

                $categories = array_map(function ($idLinea) {
                    return [
                        'code' => $idLinea,
                        'name' => "Categoría {$idLinea}" // Nombre por defecto
                    ];
                }, $allIdLineas);
            }

            $response = [
                'success' => true,
                'categories' => $categories
            ];

            // Sin caché - siempre retornar datos frescos de la BD
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener categorías: ' . $e->getMessage()
            ], 500);
        }
    }
} 