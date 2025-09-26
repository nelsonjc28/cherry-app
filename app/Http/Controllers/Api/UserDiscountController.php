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
     */
    public function checkUserDiscounts(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_ids' => 'required|array|max:100', // Limitar a 100 productos máximo
                'product_ids.*' => 'string|max:50' // Limitar longitud de IDs
            ]);

            $userId = auth('api')->id();
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

            // Obtener ofertas activas que incluyan al usuario
            $activeOffers = CatalogOffer::active()
                ->where(function ($query) use ($userId) {
                    // Ofertas que incluyen específicamente a este usuario
                    $query->whereJsonContains('target_users', $userId)
                          // O ofertas generales (target_users vacío o null)
                          ->orWhereNull('target_users')
                          ->orWhere('target_users', '[]');
                })
                ->get();

            $discounts = [];

            foreach ($productIds as $productId) {
                foreach ($activeOffers as $offer) {
                    // Verificar si la oferta aplica a este producto específico
                    $targetProducts = $offer->target_products ?? [];
                    
                    // Si target_products está vacío, aplica a todos los productos
                    if (empty($targetProducts)) {
                        $productMatches = true;
                    } else {
                        $productMatches = false;
                        foreach ($targetProducts as $targetProduct) {
                            // Manejar tanto strings como objetos
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
                        // Verificar si el usuario está en la lista de usuarios objetivo
                        $targetUsers = $offer->target_users ?? [];
                        
                        if (empty($targetUsers) || in_array($userId, $targetUsers)) {
                            // Construir respuesta base
                            $discountData = [
                                'offer_id' => $offer->id,
                                'title' => $offer->title,
                                'discount_category' => $offer->discount_category,
                                'end_date' => $offer->end_date->format('Y-m-d H:i:s')
                            ];

                            // Agregar campos específicos según el tipo de oferta
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
                            break; // Aplicar solo el primer descuento encontrado por producto
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'discounts' => $discounts
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Datos de validación incorrectos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error en checkUserDiscounts: ' . $e->getMessage(), [
                'user_id' => auth('api')->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error interno del servidor'
            ], 500);
        }
    }

    /**
     * Calcular precio con descuento aplicado
     */
    public function calculateDiscountedPrice($originalPrice, $discountData): float
    {
        if (!$discountData) {
            return $originalPrice;
        }

        $discountType = $discountData['discount_type'];
        $discountValue = $discountData['discount_percentage'];
        $maxDiscountAmount = $discountData['max_discount_amount'] ?? null;

        if ($discountType === 'percentage') {
            $discount = ($originalPrice * $discountValue) / 100;
            
            // Aplicar descuento máximo si está configurado
            if ($maxDiscountAmount && $discount > $maxDiscountAmount) {
                $discount = $maxDiscountAmount;
            }
            
            return max(0, $originalPrice - $discount);
        } elseif ($discountType === 'fixed') {
            return max(0, $originalPrice - $discountValue);
        }

        return $originalPrice;
    }
}
