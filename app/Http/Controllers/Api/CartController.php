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
            'items' => 'nullable|array',
            'total_items' => 'nullable|integer|min:0',
            'total_price' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string',
            'discount' => 'nullable|numeric|min:0'
        ]);

        // Si no se envían items, usar arrays vacíos
        $localItems = $validated['items'] ?? [];
        $localTotalItems = $validated['total_items'] ?? 0;
        $localTotalPrice = $validated['total_price'] ?? 0;

        Log::info('Sincronizando carrito', [
            'user_id' => $user->id,
            'localItems_count' => count($localItems),
            'localItems' => $localItems,
            'localTotalItems' => $localTotalItems,
            'localTotalPrice' => $localTotalPrice
        ]);

        // Buscar carrito existente en BD
        $existingCart = Cart::where('user_id', $user->id)->first();
        
        Log::info('Carrito existente en BD', [
            'exists' => $existingCart !== null,
            'bdItems_count' => $existingCart ? count($existingCart->items ?? []) : 0,
            'bdItems' => $existingCart ? $existingCart->items : null
        ]);

        if ($existingCart && !empty($existingCart->items)) {
            // Hay carrito en BD: combinar con localStorage (si hay items)
            if (!empty($localItems)) {
                // Combinar items: agregar items de localStorage que no estén en BD
                // Si hay duplicados (mismo producto-color-talla), sumar cantidades
                $bdItems = $existingCart->items ?? [];
                
                // Crear un mapa de items de BD por clave única (id_articulo-color-size)
                $bdItemsMap = [];
                foreach ($bdItems as $item) {
                    $key = $this->getItemKey($item);
                    $bdItemsMap[$key] = $item;
                }

                // Combinar items de localStorage con items de BD
                foreach ($localItems as $item) {
                    $key = $this->getItemKey($item);
                    if (isset($bdItemsMap[$key])) {
                        // Si existe, sumar cantidades (no perder items)
                        $existingQuantity = $bdItemsMap[$key]['quantity'] ?? 0;
                        $newQuantity = $item['quantity'] ?? 0;
                        $bdItemsMap[$key]['quantity'] = $existingQuantity + $newQuantity;
                        
                        // Preservar userOffer si existe en alguno de los dos
                        if (isset($item['userOffer']) && !isset($bdItemsMap[$key]['userOffer'])) {
                            $bdItemsMap[$key]['userOffer'] = $item['userOffer'];
                        }
                    } else {
                        // Si no existe, agregarlo
                        $bdItemsMap[$key] = $item;
                    }
                }

                $mergedItems = array_values($bdItemsMap);
            } else {
                // No hay items en localStorage, mantener carrito de BD
                $mergedItems = $existingCart->items;
            }
            
            // Recalcular totales considerando freeItemsCount y ofertas
            $totalItems = 0;
            $totalPrice = 0;
            
            foreach ($mergedItems as $item) {
                $quantity = $item['quantity'] ?? 0;
                $freeItems = $item['freeItemsCount'] ?? 0;
                $totalItems += $quantity + $freeItems;
                
                // Calcular precio considerando ofertas Buy X Get Y
                $itemPrice = $item['price'] ?? $item['precio'] ?? 0;
                if (isset($item['userOffer']) && $item['userOffer']['discount_category'] === 'buy_x_get_y') {
                    $paidQuantity = $item['_paidQuantity'] ?? ($quantity - $freeItems);
                    $totalPrice += $itemPrice * $paidQuantity;
                } else {
                    $totalPrice += $itemPrice * $quantity;
                }
            }

            $cart = $existingCart->update([
                'items' => $mergedItems,
                'total_items' => $totalItems,
                'total_price' => $totalPrice,
                'coupon_code' => $validated['coupon_code'] ?? $existingCart->coupon_code,
                'discount' => $validated['discount'] ?? $existingCart->discount
            ]);

            $cart = $existingCart->fresh();
        } else {
            // No hay carrito en BD: crear uno nuevo con items de localStorage (si existen)
            if (!empty($localItems)) {
                Log::info('Creando nuevo carrito con items de localStorage', [
                    'items_count' => count($localItems),
                    'items' => $localItems
                ]);
                
                $cart = Cart::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'items' => $localItems,
                        'total_items' => $localTotalItems,
                        'total_price' => $localTotalPrice,
                        'coupon_code' => $validated['coupon_code'] ?? null,
                        'discount' => $validated['discount'] ?? 0
                    ]
                );
                
                Log::info('Carrito creado exitosamente', [
                    'cart_id' => $cart->id,
                    'items_count' => count($cart->items ?? []),
                    'items' => $cart->items,
                    'total_items' => $cart->total_items,
                    'total_price' => $cart->total_price
                ]);
            } else {
                // No hay items en localStorage ni en BD: crear carrito vacío
                Log::info('Creando carrito vacío (sin items en localStorage ni BD)');
                
                $cart = Cart::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'items' => [],
                        'total_items' => 0,
                        'total_price' => 0,
                        'coupon_code' => null,
                        'discount' => 0
                    ]
                );
            }
        }

        Log::info('✅ Carrito sincronizado desde localStorage', [
            'user_id' => $user->id,
            'cart_id' => $cart->id,
            'items_count_in_db' => count($cart->items ?? []),
            'items_in_db' => $cart->items,
            'total_items' => $cart->total_items,
            'total_price' => $cart->total_price,
            'localItems_received' => count($localItems),
            'localItems_received_data' => $localItems,
            'was_merged' => $existingCart && !empty($existingCart->items) && !empty($localItems)
        ]);

        // IMPORTANTE: Devolver el carrito completo con todos los datos para confirmar guardado
        return response()->json([
            'success' => true,
            'cart' => $cart,
            'message' => 'Carrito sincronizado exitosamente',
            'debug' => [
                'cart_id' => $cart->id,
                'items_count' => count($cart->items ?? []),
                'items' => $cart->items,
                'localItems_received' => count($localItems)
            ]
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
