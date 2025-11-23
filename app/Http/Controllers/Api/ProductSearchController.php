<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\CatalogOffer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;

class ProductSearchController extends Controller
{
    /**
     * Buscar productos por descripción
     * Busca productos en la tabla productos donde la descripción contiene el término de búsqueda
     */
    public function search(Request $request): JsonResponse
    {
        try {
            $query = trim($request->input('q', ''));
            $page = (int) $request->input('page', 1);
            // Sin límite - obtener todos los productos que coincidan
            $perPage = PHP_INT_MAX; // Sin límite
            
            // Si no hay query, devolver todos los productos
            if (empty($query)) {
                return $this->getAllProducts($request);
            }

            // Cache key para esta búsqueda (sin paginación)
            $cacheKey = 'product_search_' . md5(strtolower($query));
            
            // Intentar obtener del cache (5 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            $queryLower = strtolower($query);
            $queryParam = '%' . $queryLower . '%';
            
            // Buscar productos que coincidan en:
            // 1. ID del producto
            // 2. Descripción (nombre)
            // 3. SKU del producto
            // 4. Color (en detalles)
            // 5. Talla (detalle en detalles)
            
            // Obtener IDs de productos que coincidan en la tabla productos
            $productIdsFromProducts = DB::table('productos')
                ->select('productos.id')
                ->where(function($q) use ($queryLower, $queryParam) {
                    // Buscar en productos: ID, descripción, SKU
                    $q->whereRaw('LOWER(productos.id) LIKE ?', [$queryParam])
                      ->orWhereRaw('LOWER(productos.descripcion) LIKE ?', [$queryParam])
                      ->orWhereRaw('LOWER(productos.sku) LIKE ?', [$queryParam]);
                })
                ->pluck('id')
                ->toArray();
            
            // Obtener IDs de productos que coincidan en detalles (color, talla, SKU)
            $productIdsFromDetails = DB::table('detalles')
                ->select('detalles.producto_id')
                ->where(function($q) use ($queryLower, $queryParam) {
                    $q->whereRaw('LOWER(detalles.nombreColor) LIKE ?', [$queryParam])
                      ->orWhereRaw('LOWER(detalles.detalle) LIKE ?', [$queryParam])
                      ->orWhereRaw('LOWER(detalles.sku) LIKE ?', [$queryParam]);
                })
                ->distinct()
                ->pluck('producto_id')
                ->toArray();
            
            // Combinar y obtener IDs únicos
            $allProductIds = array_unique(array_merge($productIdsFromProducts, $productIdsFromDetails));
            
            if (empty($allProductIds)) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0,
                        'page' => $page,
                        'per_page' => $perPage,
                        'last_page' => 0
                    ]
                ]);
            }
            
            $total = count($allProductIds);
            
            // Sin paginación - obtener TODOS los productos que coincidan
            $paginatedIds = $allProductIds; // Todos los IDs sin límite
            
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
                    'productos.inventario',
                    'productos.sku'
                ])
                ->whereIn('productos.id', $paginatedIds)
                ->get();

            // Obtener IDs de productos para buscar colores
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
            $products = [];
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
                
                $products[] = [
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
                    'products' => $products,
                    'total' => $total,
                    'page' => 1,
                    'per_page' => $total, // Todos los productos encontrados
                    'last_page' => 1
                ]
            ];
            
            // Guardar en cache por 5 minutos
            Cache::put($cacheKey, $response, 300);
            
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al buscar productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener todos los productos de la base de datos local
     */
    public function getAllProducts(Request $request): JsonResponse
    {
        try {
            // Sin límite - obtener TODOS los productos
            $perPage = PHP_INT_MAX;

            // Cache key para todos los productos
            $cacheKey = 'all_products_complete';
            
            // Intentar obtener del cache (10 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            // Obtener TODOS los productos SIN límite
            $productos = DB::table('productos')
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
                    'productos.marca',
                    'productos.inventario'
                ])
                ->get();

            $total = $productos->count();

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
                    
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle
                    ];
                    
                    if (!in_array($detalle->nombreColor, $coloresPorProducto[$detalle->producto_id])) {
                        $coloresPorProducto[$detalle->producto_id][] = $detalle->nombreColor;
                    }
                }
            }

            // Obtener ratings de todos los productos de una vez (solo aprobadas)
            $ratingsPorProducto = [];
            if (!empty($productIds)) {
                $reviews = DB::table('reviews')
                    ->select('product_id', 'rating')
                    ->whereIn('product_id', $productIds)
                    ->where('is_approved', true)
                    ->get();
                
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
                
                foreach ($ratingsGrouped as $productId => $data) {
                    $average = $data['count'] > 0 ? ($data['sum'] / $data['count']) : 0;
                    $ratingsPorProducto[$productId] = [
                        'rating' => round($average, 2),
                        'count' => $data['count']
                    ];
                }
            }

            // Construir respuesta
            $products = [];
            $now = time();
            $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60);
            
            foreach ($productos as $producto) {
                $precio1Raw = $producto->precio1;
                $precio1 = 0;
                if (is_numeric($precio1Raw)) {
                    $precio1 = (float) $precio1Raw;
                } elseif (is_string($precio1Raw)) {
                    $precio1 = (float) str_replace(',', '', $precio1Raw);
                }
                
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
                
                $isNew = false;
                if ($producto->opc_nuevo === 'S') {
                    $isNew = true;
                } elseif ($producto->fecha_alta) {
                    $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                    if ($fechaAltaTimestamp && $fechaAltaTimestamp > $fortyFiveDaysAgo) {
                        $isNew = true;
                    }
                }
                
                $colors = $coloresPorProducto[$producto->id] ?? [];
                $detalles = $detallesPorProducto[$producto->id] ?? [];
                $ratingData = $ratingsPorProducto[$producto->id] ?? ['rating' => 0, 'count' => 0];
                
                $products[] = [
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
                    'colores' => $colors,
                    'isNew' => $isNew,
                    'opc_nuevo' => $producto->opc_nuevo,
                    'opc_promo' => $producto->opc_promo,
                    'desc_promo' => $producto->desc_promo,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'marca' => $producto->marca,
                    'inventario' => (float) $producto->inventario,
                    'detalles' => $detalles,
                    'rating' => $ratingData['rating'],
                    'ratingCount' => $ratingData['count'],
                    'totalRatings' => $ratingData['count']
                ];
            }

            $result = [
                'success' => true,
                'data' => [
                    'products' => $products,
                    'total' => $total,
                    'page' => 1,
                    'per_page' => $total, // Todos los productos
                    'last_page' => 1
                ]
            ];

            // Guardar en cache (10 minutos)
            Cache::put($cacheKey, $result, 600);

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos con ofertas desde la tabla productos local
     * Incluye:
     * 1. Productos con desc_promo > 0
     * 2. Productos con ofertas especiales donde el usuario logueado esté agregado
     */
    public function getProductsWithOffers(Request $request): JsonResponse
    {
        try {
            // Obtener usuario autenticado (si existe)
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();

            // Cache key incluyendo userId si existe
            $cacheKey = 'products_with_offers_' . ($userId ?? 'guest');
            
            // Intentar obtener del cache (5 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            // 1. Obtener productos con desc_promo > 0
            $productosConDescuento = DB::table('productos')
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
                    'productos.inventario',
                    'productos.sku'
                ])
                ->where('productos.desc_promo', '>', 0)
                ->get();

            $productIds = $productosConDescuento->pluck('id')->toArray();

            // 2. Si hay usuario logueado, obtener productos con ofertas especiales
            if ($userId) {
                $productosConOfertasEspeciales = DB::table('productos')
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
                        'productos.inventario',
                        'productos.sku'
                    ])
                    ->join('catalog_offer_products as cop', 'productos.id', '=', 'cop.product_id')
                    ->join('catalog_offer_users as cou', 'cop.offer_id', '=', 'cou.offer_id')
                    ->join('catalog_offers', 'cop.offer_id', '=', 'catalog_offers.id')
                    ->where('cou.user_id', $userId)
                    ->where('catalog_offers.is_active', true)
                    ->where('catalog_offers.start_date', '<=', now())
                    ->where('catalog_offers.end_date', '>=', now())
                    ->distinct()
                    ->get();

                // Combinar IDs únicos
                $productIdsConOfertas = $productosConOfertasEspeciales->pluck('id')->toArray();
                $productIds = array_unique(array_merge($productIds, $productIdsConOfertas));

                // Combinar productos (evitar duplicados)
                $productosConDescuento = $productosConDescuento->concat($productosConOfertasEspeciales)
                    ->unique('id')
                    ->values();
            }

            if (empty($productIds)) {
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

            // Obtener detalles y ratings (igual que en otros métodos)
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
                    
                    $detallesPorProducto[$detalle->producto_id][] = [
                        'nombreColor' => $detalle->nombreColor,
                        'detalle' => $detalle->detalle
                    ];
                    
                    if (!in_array($detalle->nombreColor, $coloresPorProducto[$detalle->producto_id])) {
                        $coloresPorProducto[$detalle->producto_id][] = $detalle->nombreColor;
                    }
                }
            }

            // Obtener ratings
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

            // Formatear productos
            $products = [];
            $now = time();
            $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60);

            foreach ($productosConDescuento as $producto) {
                $precio1Raw = $producto->precio1;
                $precio1 = 0;
                if (is_numeric($precio1Raw)) {
                    $precio1 = (float) $precio1Raw;
                } elseif (is_string($precio1Raw)) {
                    $precio1 = (float) str_replace(',', '', $precio1Raw);
                }
                
                $descPromoValue = (float) ($producto->desc_promo ?? 0);
                $hasDiscount = $descPromoValue > 0;
                $discountPercentage = $hasDiscount ? max(0, $descPromoValue - 10) : 0;
                $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                    ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                    : $precio1;
                
                $isNew = false;
                if ($producto->opc_nuevo === 'S') {
                    $isNew = true;
                } elseif ($producto->fecha_alta) {
                    $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                    if ($fechaAltaTimestamp && $fechaAltaTimestamp > $fortyFiveDaysAgo) {
                        $isNew = true;
                    }
                }
                
                $colors = $coloresPorProducto[$producto->id] ?? [];
                $detalles = $detallesPorProducto[$producto->id] ?? [];
                $ratingData = $ratingsPorProducto[$producto->id] ?? ['rating' => 0, 'count' => 0];
                
                $products[] = [
                    'id' => $producto->id,
                    'id_articulo' => $producto->id,
                    'id_linea' => $producto->id_linea,
                    'catalogoId' => $producto->catalogoId,
                    'title' => $producto->descripcion,
                    'descripcion' => $producto->descripcion,
                    'image' => $this->getProductImageUrl($producto->id),
                    'price' => $finalPrice,
                    'precio1' => $precio1,
                    'originalPrice' => $hasDiscount ? $originalPrice : null,
                    'discount' => $discountPercentage,
                    'colors' => $colors,
                    'colores' => $colors,
                    'isNew' => $isNew,
                    'opc_nuevo' => $producto->opc_nuevo,
                    'opc_promo' => $producto->opc_promo,
                    'desc_promo' => $producto->desc_promo,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'marca' => $producto->marca,
                    'inventario' => (float) $producto->inventario,
                    'detalles' => $detalles,
                    'rating' => $ratingData['rating'],
                    'ratingCount' => $ratingData['count'],
                    'totalRatings' => $ratingData['count']
                ];
            }

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

            // Guardar en cache (5 minutos)
            Cache::put($cacheKey, $response, 300);

            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos con ofertas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Genera la URL de imagen principal de un producto desde AWS S3.
     */
    private function getProductImageUrl(string $productId, int $imageNumber = 1): string
    {
        if (empty($productId)) {
            return asset('images/placeholder-product.png');
        }
        
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_{$imageNumber}.jpg";
    }
}
