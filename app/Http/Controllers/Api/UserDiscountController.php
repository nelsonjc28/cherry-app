<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogOffer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserDiscountController extends Controller
{
    /**
     * Verificar descuentos aplicables para un usuario y productos específicos
     * Versión optimizada con tablas separadas - SIN LÍMITES
     */
    public function checkUserDiscounts(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array', // Sin límite - las tablas separadas son súper eficientes
                'product_ids.*' => 'string|max:50' // Limitar longitud de IDs
            ]);

            // Obtener el usuario autenticado
            $userId = $request->user()?->id;
            $productIds = $validated['product_ids'];
            
            if (!$userId) {
                return response()->json([
                    'success' => true,
                    'discounts' => []
                ]);
            }

            // Validar que los product_ids no estén vacíos
            $productIds = array_filter($productIds, function($id) {
                return !empty(trim($id));
            });

            if (empty($productIds)) {
                return response()->json([
                    'success' => true,
                    'discounts' => []
                ]);
            }

            // 🚀 CONSULTA SÚPER EFICIENTE - Una sola query con JOINs
            // Esta consulta es O(log n) en lugar de O(n) del JSON
            $offers = CatalogOffer::select([
                    'catalog_offers.*',
                    'cop.product_id'
                ])
                ->join('catalog_offer_products as cop', 'catalog_offers.id', '=', 'cop.offer_id')
                ->join('catalog_offer_users as cou', 'catalog_offers.id', '=', 'cou.offer_id')
                ->whereIn('cop.product_id', $productIds)
                ->where('cou.user_id', $userId)
                ->where('catalog_offers.is_active', true)
                ->where('catalog_offers.start_date', '<=', now())
                ->where('catalog_offers.end_date', '>=', now())
                ->get();


            $discounts = [];

            foreach ($offers as $offer) {
                $productId = $offer->product_id;
                
                $discountData = [
                    'offer_id' => $offer->id,
                    'title' => $offer->title,
                    'discount_category' => $offer->discount_category,
                    'end_date' => $offer->end_date,
                ];

                if ($offer->discount_category === 'buy_x_get_y') {
                    $discountData['buy_quantity'] = $offer->buy_quantity;
                    $discountData['get_quantity'] = $offer->get_quantity;
                    $discountData['discount_type'] = 'buy_x_get_y';
                    $discountData['discount_percentage'] = 0; // No hay porcentaje para Buy X Get Y
                } elseif ($offer->discount_category === 'free_shipping') {
                    $discountData['discount_type'] = 'free_shipping';
                    $discountData['discount_percentage'] = 0; // No hay porcentaje para envío gratis
                } else {
                    $discountData['discount_percentage'] = $offer->discount_percentage;
                    $discountData['discount_type'] = $offer->discount_type;
                    $discountData['max_discount_amount'] = $offer->max_discount_amount;
                    $discountData['min_purchase_amount'] = $offer->min_purchase_amount;
                }

                $discounts[$productId] = $discountData;
            }

            return response()->json([
                'success' => true,
                'discounts' => $discounts
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al verificar descuentos',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener IDs de productos que tienen ofertas para el usuario actual
     */
    public function getUserOfferProducts(Request $request): JsonResponse
    {
        try {
            // Obtener el usuario autenticado
            $userId = $request->user()?->id;
            
            if (!$userId) {
                return response()->json([
                    'success' => true,
                    'product_ids' => []
                ]);
            }

            // Obtener IDs de productos que tienen ofertas ACTIVAS para este usuario
            // Solo productos con descuentos personalizados activos deben aparecer
            $productIds = CatalogOffer::select('cop.product_id')
                ->join('catalog_offer_products as cop', 'catalog_offers.id', '=', 'cop.offer_id')
                ->join('catalog_offer_users as cou', 'catalog_offers.id', '=', 'cou.offer_id')
                ->where('cou.user_id', $userId)
                ->where('catalog_offers.is_active', true)
                ->where('catalog_offers.start_date', '<=', now())
                ->where('catalog_offers.end_date', '>=', now())
                ->distinct()
                ->pluck('cop.product_id')
                ->toArray();

            return response()->json([
                'success' => true,
                'product_ids' => $productIds,
                'count' => count($productIds)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}