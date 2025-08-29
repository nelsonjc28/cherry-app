<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class PaymentCardController extends Controller
{
    /**
     * Display a listing of the user's payment cards.
     */
    public function index()
    {
        $user = auth()->user();
        $cards = $user->paymentCards()->active()->orderBy('is_default', 'desc')->get();

        return response()->json([
            'success' => true,
            'cards' => $cards->map(function ($card) {
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
                    'is_expired' => $card->isExpired(),
                    'created_at' => $card->created_at
                ];
            })
        ]);
    }

    /**
     * Store a newly created payment card.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cardholder_name' => 'required|string|max:255',
            'card_number' => 'required|string|min:13|max:19',
            'expiry_month' => 'required|string|size:2',
            'expiry_year' => 'required|string|size:4',
            'cvv' => 'required|string|min:3|max:4',
            'brand' => 'required|string|in:visa,mastercard,amex,discover,jcb,diners',
            'card_type' => 'required|string|in:credit,debit',
            'is_default' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->user();

        // Validar que la tarjeta no esté expirada
        $currentYear = date('Y');
        $currentMonth = date('m');
        
        if ($request->expiry_year < $currentYear || 
            ($request->expiry_year == $currentYear && $request->expiry_month < $currentMonth)) {
            return response()->json([
                'success' => false,
                'message' => 'La tarjeta está expirada'
            ], 422);
        }

        // Extraer primeros y últimos dígitos
        $cardNumber = $request->card_number;
        $firstTwo = substr($cardNumber, 0, 2);
        $lastFour = substr($cardNumber, -4);

        // Si se marca como predeterminada, desmarcar las otras
        if ($request->is_default) {
            $user->paymentCards()->update(['is_default' => false]);
        }

        // Crear la tarjeta
        $card = $user->paymentCards()->create([
            'cardholder_name' => $request->cardholder_name,
            'card_number' => Hash::make($request->card_number), // Encriptar número
            'expiry_month' => $request->expiry_month,
            'expiry_year' => $request->expiry_year,
            'cvv' => Hash::make($request->cvv), // Encriptar CVV
            'brand' => $request->brand,
            'first_two' => $firstTwo,
            'last_four' => $lastFour,
            'card_type' => $request->card_type,
            'is_default' => $request->is_default ?? false
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Tarjeta agregada correctamente',
            'card' => [
                'id' => $card->id,
                'cardholder_name' => $card->cardholder_name,
                'brand' => $card->brand,
                'brand_display_name' => $card->brand_display_name,
                'card_type' => $card->card_type,
                'card_type_display_name' => $card->card_type_display_name,
                'masked_number' => $card->masked_card_number,
                'expiry_date' => $card->expiry_date,
                'is_default' => $card->is_default,
                'is_expired' => $card->isExpired(),
                'created_at' => $card->created_at
            ]
        ], 201);
    }

    /**
     * Display the specified payment card.
     */
    public function show($id)
    {
        $user = auth()->user();
        $card = $user->paymentCards()->active()->find($id);

        if (!$card) {
            return response()->json([
                'success' => false,
                'message' => 'Tarjeta no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'card' => [
                'id' => $card->id,
                'cardholder_name' => $card->cardholder_name,
                'brand' => $card->brand,
                'brand_display_name' => $card->brand_display_name,
                'card_type' => $card->card_type,
                'card_type_display_name' => $card->card_type_display_name,
                'masked_number' => $card->masked_card_number,
                'expiry_date' => $card->expiry_date,
                'is_default' => $card->is_default,
                'is_expired' => $card->isExpired(),
                'created_at' => $card->created_at
            ]
        ]);
    }

    /**
     * Update the specified payment card.
     */
    public function update(Request $request, $id)
    {
        $user = auth()->user();
        $card = $user->paymentCards()->active()->find($id);

        if (!$card) {
            return response()->json([
                'success' => false,
                'message' => 'Tarjeta no encontrada'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'cardholder_name' => 'sometimes|required|string|max:255',
            'expiry_month' => 'sometimes|required|string|size:2',
            'expiry_year' => 'sometimes|required|string|size:4',
            'is_default' => 'sometimes|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        // Si se marca como predeterminada, desmarcar las otras
        if ($request->has('is_default') && $request->is_default) {
            $user->paymentCards()->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $card->update($request->only([
            'cardholder_name',
            'expiry_month',
            'expiry_year',
            'is_default'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Tarjeta actualizada correctamente',
            'card' => [
                'id' => $card->id,
                'cardholder_name' => $card->cardholder_name,
                'brand' => $card->brand,
                'brand_display_name' => $card->brand_display_name,
                'card_type' => $card->card_type,
                'card_type_display_name' => $card->card_type_display_name,
                'masked_number' => $card->masked_card_number,
                'expiry_date' => $card->expiry_date,
                'is_default' => $card->is_default,
                'is_expired' => $card->isExpired(),
                'created_at' => $card->created_at
            ]
        ]);
    }

    /**
     * Remove the specified payment card.
     */
    public function destroy($id)
    {
        $user = auth()->user();
        $card = $user->paymentCards()->active()->find($id);

        if (!$card) {
            return response()->json([
                'success' => false,
                'message' => 'Tarjeta no encontrada'
            ], 404);
        }

        // Soft delete (marcar como inactiva)
        $card->softDelete();

        return response()->json([
            'success' => true,
            'message' => 'Tarjeta eliminada correctamente'
        ]);
    }

    /**
     * Set a payment card as default.
     */
    public function setDefault($id)
    {
        $user = auth()->user();
        $card = $user->paymentCards()->active()->find($id);

        if (!$card) {
            return response()->json([
                'success' => false,
                'message' => 'Tarjeta no encontrada'
            ], 404);
        }

        $card->setAsDefault();

        return response()->json([
            'success' => true,
            'message' => 'Tarjeta marcada como predeterminada'
        ]);
    }

    /**
     * Test endpoint to verify API is working.
     */
    public function test()
    {
        return response()->json([
            'message' => 'API de tarjetas de pago funcionando correctamente',
            'timestamp' => now(),
            'status' => 'success'
        ], 200);
    }
}
