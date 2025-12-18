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
    public function getActiveOffers(): JsonResponse
    {
        try {
            // Obtener todas las ofertas (sin filtrar por is_active, solo por fechas)
            $activeOffers = CatalogOffer::with('catalog')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->orderBy('display_order')
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

            // Obtener ofertas activas que incluyan al usuario
            $activeOffers = CatalogOffer::active()
                ->where(function ($query) use ($userId) {
                    // Ofertas que incluyen específicamente a este usuario
                    $query->whereJsonContains('target_users', $userId)
                          // O ofertas generales (target_users vacío o null)
                          ->orWhereNull('target_users')
                          ->orWhere('target_users', '[]');
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
}
