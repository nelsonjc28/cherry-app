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
use Illuminate\Support\Facades\Log;

class ProductSearchController extends Controller
{
    /**
     * Buscar productos por descripción
     * Busca productos en la tabla productos donde la descripción contiene el término de búsqueda
     */
    public function search(Request $request): JsonResponse
    {
        try {
            // Aumentar límite de memoria para cargar todos los productos
            ini_set('memory_limit', '512M');
            
            $query = trim($request->input('q', ''));
            $page = (int) $request->input('page', 1);
            // Sin límite - obtener todos los productos que coincidan
            $perPage = PHP_INT_MAX; // Sin límite
            
            // Si no hay query, devolver todos los productos
            if (empty($query)) {
                return $this->getAllProducts($request);
            }

            // Sin caché - siempre buscar en BD fresca
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
                    ->select('producto_id', 'nombreColor', 'detalle', 'fechaMovimiento')
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
                        'fechaMovimiento' => $detalle->fechaMovimiento ? date('Y-m-d', strtotime($detalle->fechaMovimiento)) : null
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
                    'products' => $products,
                    'total' => $total,
                    'page' => 1,
                    'per_page' => $total, // Todos los productos encontrados
                    'last_page' => 1
                ]
            ];
            
            // Sin caché - siempre retornar datos frescos de la BD
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
            // Aumentar límite de memoria para cargar todos los productos
            ini_set('memory_limit', '512M');
            
            // Sin límite - obtener TODOS los productos
            $perPage = PHP_INT_MAX;

            // Sin caché - siempre obtener datos frescos de la BD
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
                    ->select('producto_id', 'nombreColor', 'detalle', 'fechaMovimiento')
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
                        'fechaMovimiento' => $detalle->fechaMovimiento ? date('Y-m-d', strtotime($detalle->fechaMovimiento)) : null
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
                    'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
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

            // Sin caché - siempre retornar datos frescos de la BD
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
            $userIdApi = auth('api')->id();
            $userIdWeb = auth('web')->id();
            $userIdAuth = auth()->id();
            $userId = $userIdApi ?? $userIdWeb ?? $userIdAuth;
            
            // Debug: Verificar autenticación
            $token = $request->bearerToken() ?? $request->header('Authorization');
            Log::info('🔍 getProductsWithOffers - Debug autenticación:', [
                'userIdApi' => $userIdApi,
                'userIdWeb' => $userIdWeb,
                'userIdAuth' => $userIdAuth,
                'userIdFinal' => $userId,
                'hasToken' => !empty($token),
                'tokenPreview' => $token ? substr($token, 0, 20) . '...' : 'no token'
            ]);

            // Cache key incluyendo userId si existe
            $cacheKey = 'products_with_offers_' . ($userId ?? 'guest');
            
            // TEMPORALMENTE DESHABILITADO EL CACHE PARA DEBUGGING
            // Intentar obtener del cache (5 minutos)
            // $cached = Cache::get($cacheKey);
            // if ($cached !== null) {
            //     return response()->json($cached);
            // }
            
            Log::info('🔍 getProductsWithOffers - Usuario ID: ' . ($userId ?? 'no autenticado'));

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
            Log::info('Productos con desc_promo > 0: ' . count($productIds));

            // 2. Si hay usuario logueado, obtener productos con ofertas personalizadas del módulo de descuentos
            $productIdsConOfertasPersonalizadas = []; // Inicializar fuera del if para que esté disponible después
            if ($userId) {
                Log::info('🔍 Buscando productos con ofertas personalizadas para usuario: ' . $userId);
                
                // Primero obtener información de las ofertas activas para este usuario
                $ofertasActivasInfo = DB::table('catalog_offer_users as cou')
                    ->join('catalog_offers', 'cou.offer_id', '=', 'catalog_offers.id')
                    ->where('cou.user_id', $userId)
                    ->where('catalog_offers.is_active', true)
                    ->where('catalog_offers.start_date', '<=', now())
                    ->where('catalog_offers.end_date', '>=', now())
                    ->select('catalog_offers.id as offer_id', 'catalog_offers.title', 'catalog_offers.start_date', 'catalog_offers.end_date')
                    ->get();
                
                Log::info('🔍 Ofertas activas para este usuario: ' . $ofertasActivasInfo->count());
                foreach ($ofertasActivasInfo as $oferta) {
                    Log::info('🔍 Oferta ID: ' . $oferta->offer_id . ' - ' . $oferta->title . ' (' . $oferta->start_date . ' - ' . $oferta->end_date . ')');
                }
                
                // Obtener productos de TODAS las ofertas activas
                // Estas son las ofertas creadas en el módulo de descuentos (catalog_offers)
                $productIdsConOfertasPersonalizadas = DB::table('catalog_offer_products as cop')
                    ->join('catalog_offer_users as cou', 'cop.offer_id', '=', 'cou.offer_id')
                    ->join('catalog_offers', 'cop.offer_id', '=', 'catalog_offers.id')
                    ->where('cou.user_id', $userId)
                    ->where('catalog_offers.is_active', true)
                    ->where('catalog_offers.start_date', '<=', now())
                    ->where('catalog_offers.end_date', '>=', now())
                    ->distinct()
                    ->pluck('cop.product_id')
                    ->toArray();
                
                Log::info('🔍 IDs de productos con ofertas personalizadas encontrados en catalog_offer_products: ' . count($productIdsConOfertasPersonalizadas));
                if (count($productIdsConOfertasPersonalizadas) > 0) {
                    Log::info('🔍 Primeros 10 IDs de catalog_offer_products: ' . implode(', ', array_slice($productIdsConOfertasPersonalizadas, 0, 10)));
                    
                    // Verificar productos por oferta
                    foreach ($ofertasActivasInfo as $oferta) {
                        $productosEnOferta = DB::table('catalog_offer_products')
                            ->where('offer_id', $oferta->offer_id)
                            ->distinct()
                            ->pluck('product_id')
                            ->toArray();
                        Log::info('🔍 Oferta ID ' . $oferta->offer_id . ' tiene ' . count($productosEnOferta) . ' productos');
                    }
                } else {
                    // Debug: Verificar si hay ofertas activas para este usuario
                    $ofertasActivas = DB::table('catalog_offer_users as cou')
                        ->join('catalog_offers', 'cou.offer_id', '=', 'catalog_offers.id')
                        ->where('cou.user_id', $userId)
                        ->where('catalog_offers.is_active', true)
                        ->where('catalog_offers.start_date', '<=', now())
                        ->where('catalog_offers.end_date', '>=', now())
                        ->count();
                    Log::info('🔍 Ofertas activas para este usuario: ' . $ofertasActivas);
                    
                    if ($ofertasActivas > 0) {
                        // Verificar productos en esas ofertas
                        $productosEnOfertas = DB::table('catalog_offer_products as cop')
                            ->join('catalog_offer_users as cou', 'cop.offer_id', '=', 'cou.offer_id')
                            ->join('catalog_offers', 'cop.offer_id', '=', 'catalog_offers.id')
                            ->where('cou.user_id', $userId)
                            ->where('catalog_offers.is_active', true)
                            ->where('catalog_offers.start_date', '<=', now())
                            ->where('catalog_offers.end_date', '>=', now())
                            ->count();
                        Log::info('🔍 Productos en ofertas activas: ' . $productosEnOfertas);
                    }
                }
                
                // Ahora obtener los productos completos de la tabla productos
                if (!empty($productIdsConOfertasPersonalizadas)) {
                    // Normalizar IDs a string para comparación (productos.id es string)
                    $productIdsConOfertasNormalized = array_map('strval', $productIdsConOfertasPersonalizadas);
                    
                    Log::info('🔍 Buscando productos en tabla productos con IDs normalizados: ' . count($productIdsConOfertasNormalized));
                    Log::info('🔍 Primeros 5 IDs normalizados: ' . implode(', ', array_slice($productIdsConOfertasNormalized, 0, 5)));
                    
                    // Obtener productos usando whereIn con CAST explícito para asegurar comparación correcta
                    // productos.id es string, así que comparamos directamente pero con CAST para seguridad
                    $productosConOfertasPersonalizadas = DB::table('productos')
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
                        ->whereIn(DB::raw('CAST(productos.id AS CHAR)'), $productIdsConOfertasNormalized)
                        ->get();
                    
                    Log::info('🔍 Productos completos encontrados en tabla productos para ofertas personalizadas: ' . $productosConOfertasPersonalizadas->count());
                    
                    if ($productosConOfertasPersonalizadas->count() === 0 && count($productIdsConOfertasNormalized) > 0) {
                        // Debug: Verificar si los productos existen en la tabla productos
                        $primerosIds = array_slice($productIdsConOfertasNormalized, 0, 5);
                        $productosExistentes = DB::table('productos')
                            ->whereIn('productos.id', $primerosIds)
                            ->pluck('id')
                            ->toArray();
                        Log::info('🔍 Primeros 5 IDs buscados: ' . implode(', ', $primerosIds));
                        Log::info('🔍 Productos encontrados en tabla productos: ' . implode(', ', $productosExistentes));
                    }

                    // Combinar IDs únicos (sin duplicados)
                    $productIds = array_unique(array_merge($productIds, $productIdsConOfertasNormalized));

                    // Combinar productos (evitar duplicados)
                    // Usar unique('id') para eliminar duplicados basados en el ID
                    $productosConDescuento = $productosConDescuento->concat($productosConOfertasPersonalizadas)
                        ->unique('id')
                        ->values();
                    
                    Log::info('🔍 Total de productos después de combinar: ' . $productosConDescuento->count());
                }
            } else {
                Log::info('🔍 No hay usuario autenticado, solo productos con desc_promo > 0');
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
                    ->select('producto_id', 'nombreColor', 'detalle', 'fechaMovimiento')
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
                        'fechaMovimiento' => $detalle->fechaMovimiento ? date('Y-m-d', strtotime($detalle->fechaMovimiento)) : null
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
            // IMPORTANTE: Usar $productosConDescuento que ya incluye productos con desc_promo > 0 
            // Y productos con ofertas personalizadas (si el usuario está logueado)
            $products = [];
            $now = time();
            $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60);
            
            Log::info('Total de productos a formatear: ' . $productosConDescuento->count());
            Log::info('Total de IDs únicos: ' . count($productIds));

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

            Log::info('🔍 Total de productos formateados para respuesta: ' . count($products));
            
            // Debug: Verificar si hay productos con ofertas personalizadas en la respuesta
            if ($userId && !empty($productIdsConOfertasPersonalizadas)) {
                $normalizedIds = array_map('strval', $productIdsConOfertasPersonalizadas);
                $productosConOfertasEnRespuesta = array_filter($products, function($p) use ($normalizedIds) {
                    return in_array($p['id'], $normalizedIds);
                });
                Log::info('🔍 Productos con ofertas personalizadas en la respuesta final: ' . count($productosConOfertasEnRespuesta));
                if (count($productosConOfertasEnRespuesta) > 0) {
                    $idsEnRespuesta = array_column($productosConOfertasEnRespuesta, 'id');
                    Log::info('🔍 IDs de productos con ofertas en respuesta: ' . implode(', ', array_slice($idsEnRespuesta, 0, 10)));
                } else {
                    Log::warning('⚠️ NO se encontraron productos con ofertas personalizadas en la respuesta final, aunque se encontraron IDs: ' . count($normalizedIds));
                    Log::info('🔍 IDs buscados: ' . implode(', ', array_slice($normalizedIds, 0, 10)));
                    Log::info('🔍 IDs en respuesta: ' . implode(', ', array_slice(array_column($products, 'id'), 0, 10)));
                }
            }

            // Debug: Verificar productos específicos en la respuesta
            $productosEspecificos = ['515422585712', '50552258912', '515422524904', '2855708612', '515422524512'];
            $productosEncontradosEnRespuesta = array_filter($products, function($p) use ($productosEspecificos) {
                return in_array($p['id'], $productosEspecificos);
            });
            Log::info('🔍 Productos específicos en respuesta final: ' . count($productosEncontradosEnRespuesta));
            if (count($productosEncontradosEnRespuesta) > 0) {
                $idsEncontrados = array_column($productosEncontradosEnRespuesta, 'id');
                Log::info('🔍 IDs encontrados: ' . implode(', ', $idsEncontrados));
            } else {
                Log::warning('⚠️ NINGUNO de los productos específicos está en la respuesta final');
            }

            $response = [
                'success' => true,
                'data' => [
                    'products' => $products,
                    'total' => count($products),
                    'page' => 1,
                    'per_page' => count($products),
                    'last_page' => 1
                ],
                // Debug info (temporal)
                '_debug' => [
                    'userId' => $userId,
                    'productIdsConOfertasPersonalizadas' => count($productIdsConOfertasPersonalizadas ?? []),
                    'totalProducts' => count($products),
                    'productosEspecificosEncontrados' => count($productosEncontradosEnRespuesta)
                ]
            ];

            // TEMPORALMENTE DESHABILITADO EL CACHE PARA DEBUGGING
            // Cache::put($cacheKey, $response, 300);

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
