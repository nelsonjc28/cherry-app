<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * Obtener producto completo por ID
     * Devuelve toda la información del producto incluyendo detalles para ProductPage
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            // Cache key para este producto
            $cacheKey = 'product_' . $id;
            
            // Intentar obtener del cache (10 minutos)
            $cached = Cache::get($cacheKey);
            if ($cached !== null) {
                return response()->json($cached);
            }

            // Buscar producto con sus detalles
            $producto = DB::table('productos')
                ->where('id', $id)
                ->first();

            if (!$producto) {
                return response()->json([
                    'success' => false,
                    'error' => 'Producto no encontrado'
                ], 404);
            }

            // Obtener todos los detalles del producto
            $detalles = DB::table('detalles')
                ->where('producto_id', $id)
                ->orderBy('orden')
                ->get()
                ->map(function ($detalle) {
                    return [
                        'id' => $detalle->id,
                        'producto_id' => $detalle->producto_id,
                        'art_empresa' => $detalle->art_empresa,
                        'modelo' => $detalle->modelo,
                        'detalle' => $detalle->detalle, // Talla
                        'codbarra' => $detalle->codbarra,
                        'ean' => $detalle->ean,
                        'sku' => $detalle->sku,
                        'color_file' => $detalle->color_file,
                        'opc_web' => $detalle->opc_web,
                        'orden' => $detalle->orden,
                        'inventario_d' => (float) $detalle->inventario_d,
                        'idShopify' => $detalle->idShopify,
                        'nombreColor' => $detalle->nombreColor, // Color
                        'fechaMovimiento' => $detalle->fechaMovimiento ? date('Y-m-d', strtotime($detalle->fechaMovimiento)) : null
                    ];
                })
                ->toArray();

            // Convertir precio correctamente
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
                $now = time();
                $fortyFiveDaysAgo = $now - (45 * 24 * 60 * 60);
                $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                if ($fechaAltaTimestamp && $fechaAltaTimestamp > $fortyFiveDaysAgo) {
                    $isNew = true;
                }
            }

            // Obtener colores únicos
            $colors = [];
            foreach ($detalles as $detalle) {
                if (!empty($detalle['nombreColor']) && !in_array($detalle['nombreColor'], $colors)) {
                    $colors[] = $detalle['nombreColor'];
                }
            }

            // Calcular rating desde la tabla reviews (solo aprobadas)
            // Sumar todas las estrellas y dividir entre el total de reseñas aprobadas
            $reviews = Review::where('product_id', $id)
                ->where('is_approved', true)
                ->get();
            
            $rating = 0;
            $ratingCount = count($reviews);
            if ($ratingCount > 0) {
                // Sumar todas las estrellas
                $sumRatings = $reviews->sum('rating');
                // Dividir entre el total de reseñas
                $rating = round($sumRatings / $ratingCount, 2);
            }

            // Obtener reseñas aprobadas con información del usuario
            $approvedReviews = Review::where('product_id', $id)
                ->where('is_approved', true)
                ->with('user:id,first_name,last_name')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($review) {
                    return [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'images' => $review->images,
                        'created_at' => $review->created_at->format('d/m/Y'),
                        'user' => [
                            'name' => $review->user ? ($review->user->first_name . ' ' . substr($review->user->last_name, 0, 1) . '.') : 'Usuario',
                            'avatar' => null
                        ]
                    ];
                });

            // Construir respuesta completa con todos los campos necesarios para ProductPage
            $response = [
                'success' => true,
                'data' => [
                    // Campos principales del producto
                    'id_articulo' => $producto->id,
                    'id' => $producto->id,
                    'id_linea' => $producto->id_linea ?? null,
                    'descripcion' => $producto->descripcion,
                    'marca' => $producto->marca,
                    'precio1' => $precio1,
                    'precio2' => (float) ($producto->precio2 ?? 0),
                    'precio3' => (float) ($producto->precio3 ?? 0),
                    'precio4' => (float) ($producto->precio4 ?? 0),
                    'precio5' => (float) ($producto->precio5 ?? 0),
                    'precio6' => (float) ($producto->precio6 ?? 0),
                    'precio7' => (float) ($producto->precio7 ?? 0),
                    'precio8' => (float) ($producto->precio8 ?? 0),
                    'precio9' => (float) ($producto->precio9 ?? 0),
                    'precio10' => (float) ($producto->precio10 ?? 0),
                    'costo' => (float) ($producto->costo ?? 0),
                    'imagen' => $producto->imagen,
                    'piezas' => $producto->piezas ?? 0,
                    'inventario' => (float) ($producto->inventario ?? 0),
                    'especificaciones' => $producto->especificaciones ?? null,
                    'linea' => $producto->id_linea ?? null,
                    'sector' => $producto->sector_id ?? null,
                    'genero' => $producto->genero_id ?? null,
                    'notas' => $producto->notas ?? null,
                    'art_empresa' => $producto->art_empresa ?? 1,
                    'id_provedor' => $producto->id_provedor ?? null,
                    'tkmov' => $producto->tkmov ?? null,
                    'tipo_venta' => $producto->tipo_venta ?? null,
                    'iva' => $producto->iva ?? null,
                    'stockmin' => $producto->stockmin ?? 0,
                    'stockmax' => $producto->stockmax ?? 0,
                    'proporcion' => $producto->proporcion ?? null,
                    'sku' => $producto->sku ?? null,
                    'ean' => $producto->ean ?? null,
                    'codbarra' => $producto->codbarra ?? null,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'activo' => $producto->activo ?? 1,
                    'tipoart' => $producto->tipoart ?? null,
                    'url_video' => $producto->url_video ?? null,
                    'descuento' => (float) ($producto->descuento ?? 0),
                    'catalogoId' => $producto->catalogoId ?? null,
                    'generoId' => $producto->genero_id ?? null,
                    'sectorId' => $producto->sector_id ?? null,
                    'fechaAct' => $producto->fechaAct ?? null,
                    
                    // Campos de promoción
                    'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                    'opc_promo' => $producto->opc_promo ?? 'N',
                    'desc_promo' => (float) ($producto->desc_promo ?? 0),
                    
                    // Campos calculados
                    'price' => $finalPrice, // Precio final con descuento reducido aplicado
                    'precio1' => $precio1, // Precio base original
                    'originalPrice' => $hasDiscount ? $originalPrice : null,
                    'discount' => $discountPercentage, // Descuento reducido (desc_promo - 10)
                    'isNew' => $isNew,
                    'colors' => $colors,
                    'colores' => $colors, // Alias para compatibilidad
                    
                    // Detalles completos
                    'detalles' => $detalles,
                    
                    // Campos adicionales para compatibilidad
                    'title' => $producto->descripcion,
                    'image' => $producto->imagen,
                    'stock' => (float) ($producto->inventario ?? 0),
                    'rating' => $rating,
                    'ratingCount' => $ratingCount,
                    'totalRatings' => $ratingCount,
                    
                    // Reseñas aprobadas
                    'reviews' => $approvedReviews
                ]
            ];

            // Guardar en cache por 10 minutos
            Cache::put($cacheKey, $response, 600);
            
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener el producto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos nuevos (últimos 45 días)
     * Limitado a 4 productos para la sección "Checa lo mas nuevo"
     */
    public function getNewProducts(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 4);
            
            // Calcular fecha límite (45 días atrás desde hoy)
            $fortyFiveDaysAgoDate = now()->subDays(45)->format('Y-m-d');

            // Obtener productos nuevos con sus detalles
            // Solo productos con fecha_alta dentro de los últimos 45 días
            $productos = DB::table('productos')
                ->leftJoin('detalles', 'productos.id', '=', 'detalles.producto_id')
                ->select(
                    'productos.id',
                    'productos.descripcion',
                    'productos.marca',
                    'productos.precio1',
                    'productos.precio2',
                    'productos.precio3',
                    'productos.precio4',
                    'productos.precio5',
                    'productos.precio6',
                    'productos.precio7',
                    'productos.precio8',
                    'productos.precio9',
                    'productos.precio10',
                    'productos.imagen',
                    'productos.inventario',
                    'productos.fecha_alta',
                    'productos.opc_nuevo',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.sector_id',
                    'productos.genero_id',
                    'detalles.nombreColor',
                    'detalles.detalle',
                    'detalles.inventario_d'
                )
                ->whereNotNull('productos.fecha_alta')
                ->where('productos.fecha_alta', '>=', $fortyFiveDaysAgoDate)
                ->orderBy('productos.fecha_alta', 'desc')
                ->orderBy('productos.id', 'desc')
                ->distinct()
                ->limit($limit)
                ->get()
                ->groupBy('id')
                ->map(function ($productGroup) {
                    $producto = $productGroup->first();
                    
                    // Convertir precio
                    $precio1Raw = $producto->precio1;
                    $precio1 = 0;
                    if (is_numeric($precio1Raw)) {
                        $precio1 = (float) $precio1Raw;
                    } elseif (is_string($precio1Raw)) {
                        $precio1 = (float) str_replace(',', '', $precio1Raw);
                    }

                    // Calcular descuento
                    $descPromoValue = (float) ($producto->desc_promo ?? 0);
                    $hasDiscount = $descPromoValue > 0;
                    $discountPercentage = $hasDiscount ? max(0, $descPromoValue - 10) : 0;
                    $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                    $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                        ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                        : $precio1;

                    // Obtener colores y tallas únicos
                    $colors = $productGroup->pluck('nombreColor')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                    
                    $sizes = $productGroup->pluck('detalle')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();

                    // Calcular inventario total
                    $inventarioTotal = $productGroup->sum('inventario_d') ?: (float) ($producto->inventario ?? 0);

                    // Obtener rating
                    $reviews = Review::where('product_id', $producto->id)
                        ->where('is_approved', true)
                        ->get();
                    
                    $rating = 0;
                    $ratingCount = count($reviews);
                    if ($ratingCount > 0) {
                        $rating = round($reviews->sum('rating') / $ratingCount, 2);
                    }

                    return [
                        'id' => $producto->id,
                        'id_articulo' => $producto->id,
                        'title' => $producto->descripcion,
                        'description' => $producto->descripcion,
                        'price' => $finalPrice,
                        'originalPrice' => $originalPrice,
                        'discount' => $discountPercentage,
                        'image' => $producto->imagen ?: null,
                        'brand' => $producto->marca ?? 'Sin marca',
                        'stock' => $inventarioTotal,
                        'inventario' => $inventarioTotal,
                        'colors' => $colors,
                        'sizes' => $sizes,
                        'isNew' => true,
                        'rating' => $rating,
                        'ratingCount' => $ratingCount,
                        'id_linea' => $producto->id_linea,
                        'category_id' => $producto->id_linea,
                        'catalogoId' => $producto->catalogoId,
                        'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                        'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                        'opc_promo' => $producto->opc_promo ?? 'N',
                        'desc_promo' => $descPromoValue
                    ];
                })
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $productos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos nuevos: ' . $e->getMessage()
            ], 500);
        }
    }
}

