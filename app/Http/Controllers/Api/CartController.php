<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CartController extends Controller
{
    /**
     * Get the current user's cart
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();

        if (!$cart) {
            // Crear carrito vacío si no existe
            $cart = Cart::create([
                'user_id' => $user->id,
                'items' => [],
                'total_items' => 0,
                'total_price' => 0,
                'coupon_code' => null,
                'discount' => 0
            ]);
        }

        return response()->json([
            'success' => true,
            'cart' => $cart
        ]);
    }

    /**
     * Update the cart
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'total_items' => 'required|integer|min:0',
            'total_price' => 'required|numeric|min:0',
            'coupon_code' => 'nullable|string',
            'discount' => 'nullable|numeric|min:0'
        ]);

        $cart = Cart::updateOrCreate(
            ['user_id' => $user->id],
            [
                'items' => $validated['items'],
                'total_items' => $validated['total_items'],
                'total_price' => $validated['total_price'],
                'coupon_code' => $validated['coupon_code'] ?? null,
                'discount' => $validated['discount'] ?? 0
            ]
        );

        Log::info('Carrito actualizado para usuario', [
            'user_id' => $user->id,
            'total_items' => $cart->total_items,
            'total_price' => $cart->total_price
        ]);

        return response()->json([
            'success' => true,
            'cart' => $cart
        ]);
    }

    /**
     * Clear the cart
     */
    public function destroy(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $cart = Cart::where('user_id', $user->id)->first();

        if ($cart) {
            $cart->update([
                'items' => [],
                'total_items' => 0,
                'total_price' => 0,
                'coupon_code' => null,
                'discount' => 0
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Carrito limpiado exitosamente'
        ]);
    }

    /**
     * Sync cart from localStorage to database
     */
    public function sync(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'total_items' => 'required|integer|min:0',
            'total_price' => 'required|numeric|min:0',
            'coupon_code' => 'nullable|string',
            'discount' => 'nullable|numeric|min:0'
        ]);

        // Si el usuario ya tiene un carrito en BD, combinar items (priorizar BD si hay conflictos)
        $existingCart = Cart::where('user_id', $user->id)->first();

        if ($existingCart && !empty($existingCart->items)) {
            // Combinar items: agregar items de localStorage que no estén en BD
            $bdItems = $existingCart->items ?? [];
            $localItems = $validated['items'] ?? [];
            
            // Crear un mapa de items de BD por clave única (id_articulo-color-size)
            $bdItemsMap = [];
            foreach ($bdItems as $item) {
                $key = $this->getItemKey($item);
                $bdItemsMap[$key] = $item;
            }

            // Agregar items de localStorage que no existan en BD
            foreach ($localItems as $item) {
                $key = $this->getItemKey($item);
                if (!isset($bdItemsMap[$key])) {
                    $bdItemsMap[$key] = $item;
                }
            }

            $mergedItems = array_values($bdItemsMap);
            
            // Recalcular totales
            $totalItems = array_sum(array_column($mergedItems, 'quantity'));
            $totalPrice = array_sum(array_map(function($item) {
                return ($item['price'] ?? $item['precio'] ?? 0) * ($item['quantity'] ?? 0);
            }, $mergedItems));

            $cart = $existingCart->update([
                'items' => $mergedItems,
                'total_items' => $totalItems,
                'total_price' => $totalPrice,
                'coupon_code' => $validated['coupon_code'] ?? $existingCart->coupon_code,
                'discount' => $validated['discount'] ?? $existingCart->discount
            ]);

            $cart = $existingCart->fresh();
        } else {
            // Crear nuevo carrito con items de localStorage
            $cart = Cart::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'items' => $validated['items'],
                    'total_items' => $validated['total_items'],
                    'total_price' => $validated['total_price'],
                    'coupon_code' => $validated['coupon_code'] ?? null,
                    'discount' => $validated['discount'] ?? 0
                ]
            );
        }

        Log::info('Carrito sincronizado desde localStorage', [
            'user_id' => $user->id,
            'total_items' => $cart->total_items,
            'total_price' => $cart->total_price
        ]);

        return response()->json([
            'success' => true,
            'cart' => $cart
        ]);
    }

    /**
     * Generate unique key for cart item
     */
    private function getItemKey($item): string
    {
        $productId = $item['id_articulo'] ?? $item['product_id'] ?? $item['id'] ?? '';
        $color = $item['selectedColor'] ?? $item['color'] ?? '';
        $size = $item['selectedSize'] ?? $item['size'] ?? '';
        
        return "{$productId}-{$color}-{$size}";
    }
}
