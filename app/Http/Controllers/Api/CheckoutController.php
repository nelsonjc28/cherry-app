<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\PaymentCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CheckoutController extends Controller
{
    /**
     * Get checkout data for the authenticated user
     * Includes user info, addresses, and payment cards
     */
    public function getCheckoutData()
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        // Obtener direcciones del usuario
        $addresses = $user->addresses()
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($address) {
                return [
                    'id' => $address->id,
                    'name' => $address->name,
                    'street_address' => $address->street_address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'postal_code' => $address->postal_code,
                    'country' => $address->country,
                    'additional_info' => $address->additional_info,
                    'is_default' => $address->is_default,
                    'full_address' => $address->full_address
                ];
            });

        // Obtener tarjetas de pago del usuario
        $paymentCards = $user->paymentCards()
            ->where('is_active', true)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($card) {
                return [
                    'id' => $card->id,
                    'cardholder_name' => $card->cardholder_name,
                    'brand' => $card->brand,
                    'brand_display_name' => $card->brand_display_name,
                    'card_type' => $card->card_type,
                    'card_type_display_name' => $card->card_type_display_name,
                    'masked_number' => $card->masked_card_number,
                    'expiry_date' => $card->expiry_date,
                    'is_default' => $card->is_default,
                    'is_expired' => $card->isExpired()
                ];
            });

        // Datos del usuario
        $userData = [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'birth_day' => $user->birth_day,
            'birth_month' => $user->birth_month,
            'birth_year' => $user->birth_year
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $userData,
                'addresses' => $addresses,
                'payment_cards' => $paymentCards,
                'has_addresses' => $addresses->count() > 0,
                'has_payment_cards' => $paymentCards->count() > 0,
                'default_address' => $addresses->firstWhere('is_default', true),
                'default_payment_card' => $paymentCards->firstWhere('is_default', true)
            ]
        ]);
    }

    /**
     * Process checkout payment
     */
    public function processPayment(Request $request)
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        // Validar datos del checkout
        $validator = Validator::make($request->all(), [
            'address_id' => 'required|exists:addresses,id',
            'payment_card_id' => 'required|exists:payment_cards,id',
            'total_amount' => 'required|numeric|min:0.01',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.name' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verificar que la dirección pertenece al usuario
        $address = $user->addresses()->find($request->address_id);
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Dirección no encontrada o no pertenece al usuario'
            ], 404);
        }

        // Verificar que la tarjeta pertenece al usuario y está activa
        $paymentCard = $user->paymentCards()->where('is_active', true)->find($request->payment_card_id);
        if (!$paymentCard) {
            return response()->json([
                'success' => false,
                'message' => 'Tarjeta de pago no encontrada, inactiva o no pertenece al usuario'
            ], 404);
        }

        // Verificar que la tarjeta no esté expirada
        if ($paymentCard->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'La tarjeta de pago está expirada'
            ], 422);
        }

        try {
            // TODO: Aquí se integrará con MercadoPago
            // Por ahora simulamos el procesamiento
            
            $orderData = [
                'user_id' => $user->id,
                'address_id' => $request->address_id,
                'payment_card_id' => $request->payment_card_id,
                'total_amount' => $request->total_amount,
                'items' => $request->items,
                'status' => 'pending', // pending, processing, completed, failed
                'payment_method' => 'credit_card',
                'created_at' => now()
            ];

            return response()->json([
                'success' => true,
                'message' => 'Pago procesado correctamente',
                'order' => $orderData,
                'payment_status' => 'pending',
                'next_step' => 'redirect_to_mercadopago'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el pago: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test endpoint to verify API is working
     */
    public function test()
    {
        return response()->json([
            'message' => 'API de checkout funcionando correctamente',
            'timestamp' => now(),
            'status' => 'success'
        ], 200);
    }
}
