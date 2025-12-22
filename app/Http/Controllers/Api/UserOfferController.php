<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogOffer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserOfferController extends Controller
{
    /**
     * Obtener todas las ofertas activas públicas (sin autenticación requerida)
     */
    public function getActiveOffers(Request $request): JsonResponse
    {
        try {
            // Intentar obtener el usuario desde diferentes guards
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();
            
            // Obtener ofertas activas (filtrar por fechas)
            $query = CatalogOffer::with('catalog')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now());
            
            // Si hay usuario logueado, filtrar ofertas que incluyan a este usuario
            // o que sean generales (sin usuarios específicos)
            if ($userId) {
                $query->where(function ($q) use ($userId) {
                    // Ofertas que incluyen específicamente a este usuario
                    $q->whereHas('offerUsers', function ($subQuery) use ($userId) {
                        $subQuery->where('user_id', $userId);
                    })
                    // O ofertas generales (sin usuarios específicos)
                    ->orWhereDoesntHave('offerUsers');
                });
            } else {
                // Si no hay usuario, solo mostrar ofertas generales (sin usuarios específicos)
                $query->whereDoesntHave('offerUsers');
            }
            
            $activeOffers = $query->orderBy('display_order')
                ->orderBy('created_at', 'desc')
                ->get();

            // Formatear ofertas para el frontend
            $formattedOffers = $activeOffers->map(function ($offer) {
                return [
                    'id' => $offer->id,
                    'title' => $offer->title,
                    'description' => $offer->description,
                    'discount_percentage' => $offer->discount_percentage,
                    'discount_type' => $offer->discount_type,
                    'discount_category' => $offer->discount_category,
                    'start_date' => $offer->start_date->format('Y-m-d H:i:s'),
                    'end_date' => $offer->end_date->format('Y-m-d H:i:s'),
                    'banner_image' => $offer->banner_image,
                    'modal_image' => $offer->modal_image,
                    'modal_text' => $offer->modal_text,
                    'offer_code' => $offer->offer_code,
                    'min_purchase_amount' => $offer->min_purchase_amount,
                    'max_discount_amount' => $offer->max_discount_amount,
                    'buy_quantity' => $offer->buy_quantity,
                    'get_quantity' => $offer->get_quantity,
                    'catalog_id' => $offer->catalog_id,
                    'catalog' => $offer->catalog ? [
                        'id' => $offer->catalog->id,
                        'name' => $offer->catalog->name
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'offers' => $formattedOffers
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getActiveOffers: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener ofertas específicas para el usuario logueado
     * Solo devuelve ofertas personalizadas (con usuarios específicos asignados)
     */
    public function getUserOffers(Request $request): JsonResponse
    {
        try {
            // Intentar obtener el usuario desde diferentes guards
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();
            
            if (!$userId) {
                return response()->json([
                    'success' => true,
                    'offers' => []
                ]);
            }

            // Obtener SOLO ofertas personalizadas que incluyan específicamente a este usuario
            // Usar la tabla catalog_offer_users para verificar usuarios asignados
            $activeOffers = CatalogOffer::active()
                ->whereHas('offerUsers', function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                })
                ->orderBy('display_order')
                ->get();

            // Formatear ofertas para el frontend
            $formattedOffers = $activeOffers->map(function ($offer) {
                return [
                    'id' => $offer->id,
                    'title' => $offer->title,
                    'description' => $offer->description,
                    'discount_percentage' => $offer->discount_percentage,
                    'discount_type' => $offer->discount_type,
                    'discount_category' => $offer->discount_category,
                    'start_date' => $offer->start_date->format('Y-m-d H:i:s'),
                    'end_date' => $offer->end_date->format('Y-m-d H:i:s'),
                    'banner_image' => $offer->banner_image,
                    'modal_image' => $offer->modal_image,
                    'modal_text' => $offer->modal_text,
                    'offer_code' => $offer->offer_code,
                    'min_purchase_amount' => $offer->min_purchase_amount,
                    'max_discount_amount' => $offer->max_discount_amount,
                    'target_products' => $offer->target_products ?? [],
                    'catalog_id' => $offer->catalog_id
                ];
            });

            return response()->json([
                'success' => true,
                'offers' => $formattedOffers
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getUserOffers: ' . $e->getMessage(), [
                'user_id' => auth('api')->id() ?? auth('web')->id() ?? auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener productos que tienen ofertas para el usuario
     */
    public function getProductsWithUserOffers(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array|max:2000',
                'product_ids.*' => 'string|max:50'
            ]);

            // Intentar obtener el usuario desde diferentes guards
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();
            $productIds = $validated['product_ids'];
            
            if (!$userId) {
                return response()->json([
                    'success' => true,
                    'products_with_offers' => []
                ]);
            }

            // Obtener ofertas activas que incluyan al usuario
            $activeOffers = CatalogOffer::active()
                ->where(function ($query) use ($userId) {
                    $query->whereJsonContains('target_users', $userId)
                          ->orWhereNull('target_users')
                          ->orWhere('target_users', '[]');
                })
                ->get();

            $productsWithOffers = [];

            foreach ($productIds as $productId) {
                foreach ($activeOffers as $offer) {
                    $targetProducts = $offer->target_products ?? [];
                    
                    // Verificar si la oferta aplica a este producto
                    $productMatches = false;
                    if (empty($targetProducts)) {
                        $productMatches = true;
                    } else {
                        foreach ($targetProducts as $targetProduct) {
                            if (is_string($targetProduct)) {
                                if ($targetProduct === $productId) {
                                    $productMatches = true;
                                    break;
                                }
                            } elseif (is_array($targetProduct) && isset($targetProduct['id'])) {
                                if ($targetProduct['id'] === $productId) {
                                    $productMatches = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if ($productMatches) {
                        $productsWithOffers[$productId] = [
                            'offer_id' => $offer->id,
                            'title' => $offer->title,
                            'discount_percentage' => $offer->discount_percentage,
                            'discount_type' => $offer->discount_type,
                            'end_date' => $offer->end_date->format('Y-m-d H:i:s')
                        ];
                        break; // Solo la primera oferta por producto
                    }
                }
            }

            return response()->json([
                'success' => true,
                'products_with_offers' => $productsWithOffers
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getProductsWithUserOffers: ' . $e->getMessage(), [
                'user_id' => auth('api')->id() ?? auth('web')->id() ?? auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Obtener productos completos con ofertas personalizadas para el usuario
     * Filtrados por rango de fechas (start_date <= now <= end_date)
     */
    public function getUserOfferProducts(Request $request): JsonResponse
    {
        try {
            // Intentar obtener el usuario desde diferentes guards
            $userId = auth('api')->id() ?? auth('web')->id() ?? auth()->id();
            
            if (!$userId) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0
                    ]
                ]);
            }

            // Obtener productos con sus ofertas personalizadas activas
            // Solo ofertas dentro del rango de fechas: start_date <= now <= end_date
            // Y solo ofertas donde el usuario está registrado en catalog_offer_users
            $productOffers = \DB::table('catalog_offer_products as cop')
                ->join('catalog_offers', 'cop.offer_id', '=', 'catalog_offers.id')
                ->join('catalog_offer_users as cou', 'catalog_offers.id', '=', 'cou.offer_id')
                ->where('cou.user_id', $userId) // Solo ofertas donde el usuario está registrado
                ->where('catalog_offers.is_active', true)
                ->where('catalog_offers.start_date', '<=', now()) // Fecha actual >= fecha inicio
                ->where('catalog_offers.end_date', '>=', now()) // Fecha actual <= fecha fin
                ->select([
                    'cop.product_id',
                    'catalog_offers.id as offer_id',
                    'catalog_offers.discount_percentage',
                    'catalog_offers.discount_type',
                    'catalog_offers.max_discount_amount'
                ])
                ->get();
            
            \Log::info('🔍 getUserOfferProducts - Usuario: ' . $userId . ', Productos con ofertas encontrados: ' . $productOffers->count());

            if ($productOffers->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'products' => [],
                        'total' => 0
                    ]
                ]);
            }

            // Crear un mapa de producto_id => oferta para acceso rápido
            $offersByProduct = [];
            foreach ($productOffers as $productOffer) {
                $productId = $productOffer->product_id;
                if (!isset($offersByProduct[$productId])) {
                    $offersByProduct[$productId] = $productOffer;
                }
            }

            $productIds = array_keys($offersByProduct);

            // Obtener productos completos desde la base de datos
            $productos = \DB::table('productos')
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
                ->whereIn('productos.id', $productIds)
                ->get();

            // Obtener detalles (colores y tallas) para cada producto
            $detallesPorProducto = [];
            $coloresPorProducto = [];
            if ($productos->isNotEmpty()) {
                $productIdsArray = $productos->pluck('id')->toArray();
                $detalles = \DB::table('detalles')
                    ->select('producto_id', 'nombreColor', 'detalle')
                    ->whereIn('producto_id', $productIdsArray)
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

            // Formatear productos usando SOLO el descuento de la oferta personalizada
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
                
                // Obtener la oferta personalizada para este producto
                $offer = $offersByProduct[$producto->id] ?? null;
                
                // Usar SOLO el descuento de la oferta personalizada (ignorar desc_promo del producto)
                $hasDiscount = false;
                $discountPercentage = 0;
                $originalPrice = null;
                $finalPrice = $precio1;
                
                if ($offer && $precio1 > 0) {
                    $offerDiscountPercentage = (float) ($offer->discount_percentage ?? 0);
                    
                    if ($offerDiscountPercentage > 0) {
                        $hasDiscount = true;
                        $discountPercentage = $offerDiscountPercentage;
                        $originalPrice = $precio1;
                        
                        // Calcular descuento según el tipo
                        if ($offer->discount_type === 'percentage') {
                            $discountAmount = ($precio1 * $discountPercentage) / 100;
                            
                            // Aplicar descuento máximo si está configurado
                            if ($offer->max_discount_amount) {
                                $maxDiscount = (float) $offer->max_discount_amount;
                                $discountAmount = min($discountAmount, $maxDiscount);
                            }
                            
                            $finalPrice = $precio1 - $discountAmount;
                        } else {
                            // Si es descuento fijo
                            $finalPrice = max(0, $precio1 - $discountPercentage);
                        }
                    }
                }
                
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
                
                $products[] = [
                    'id' => $producto->id,
                    'id_articulo' => $producto->id,
                    'id_linea' => $producto->id_linea,
                    'catalogoId' => $producto->catalogoId,
                    'title' => $producto->descripcion,
                    'descripcion' => $producto->descripcion,
                    'imagen' => $producto->imagen,
                    'image' => $producto->imagen,
                    'precio1' => $precio1,
                    'price' => $precio1,
                    'originalPrice' => $originalPrice,
                    'finalPrice' => $finalPrice,
                    'hasDiscount' => $hasDiscount,
                    'discountPercentage' => $discountPercentage,
                    'isNew' => $isNew,
                    'marca' => $producto->marca,
                    'inventario' => $producto->inventario,
                    'colors' => $colors,
                    'detalles' => $detalles
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'products' => $products,
                    'total' => count($products)
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Error en getUserOfferProducts: ' . $e->getMessage(), [
                'user_id' => auth('api')->id() ?? auth('web')->id() ?? auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }
}
