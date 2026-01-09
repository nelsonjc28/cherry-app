<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AdminOrderController extends Controller
{
    /**
     * Get all orders for admin dashboard
     */
    public function index()
    {
        try {
            $orders = Order::with(['user', 'items.product', 'address'])
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedOrders = $orders->map(function ($order) {
                // Calcular costo de envío
                $paymentData = is_array($order->payment_data) ? $order->payment_data : (is_string($order->payment_data) ? json_decode($order->payment_data, true) : []);
                $deliveryType = $paymentData['delivery_type'] ?? 'envio';
                
                // Calcular subtotal de productos
                $subtotalProducts = $order->items->sum('subtotal');
                
                // Calcular costo de envío
                $shippingCost = 0;
                if (isset($paymentData['shipping_amount'])) {
                    $shippingCost = (float) $paymentData['shipping_amount'];
                } else {
                    // Calcular como diferencia entre total_amount y subtotal de productos
                    $totalAmount = (float) $order->total_amount;
                    if ($totalAmount > $subtotalProducts) {
                        $shippingCost = $totalAmount - $subtotalProducts;
                    }
                }
                
                // Si es retiro en tienda, el costo de envío es 0
                if ($deliveryType === 'retiro') {
                    $shippingCost = 0;
                }
                
                return [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'status' => $order->status,
                    'statusDisplay' => $this->mapOrderStatus($order->status),
                    'totalAmount' => (float) $order->total_amount,
                    'shipping_cost' => (float) $shippingCost,
                    'paymentMethod' => ucfirst($order->payment_method),
                    'paymentId' => $order->mercadopago_payment_id,
                    'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                    'customerEmail' => $order->user ? $order->user->email : 'N/A',
                    'customerPhone' => $order->user ? $order->user->phone : null,
                    'customerFirstName' => $order->user ? $order->user->first_name : null,
                    'customerLastName' => $order->user ? $order->user->last_name : null,
                    'customerMiddleName' => $order->user ? $order->user->middle_name : null,
                    'created_at' => $order->created_at->toISOString(),
                    'items' => $order->items->map(function ($item) {
                        // Obtener información del producto para calcular descuento
                        // El product_id en order_items es el ID de Shopify, necesitamos buscar en detalles por idShopify
                        $product = null;
                        $originalPrice = null;
                        $detalle = null;
                        
                        // Estrategia 1: Buscar el detalle por idShopify (más común)
                        // Intentar con diferentes formatos del ID
                        $shopifyId = (string) $item->product_id;
                        $detalle = \App\Models\Detalle::where('idShopify', $shopifyId)->first();
                        
                        // Si no se encuentra, intentar sin conversión de tipo
                        if (!$detalle) {
                            $detalle = \App\Models\Detalle::whereRaw('CAST(idShopify AS CHAR) = ?', [$shopifyId])->first();
                        }
                        
                        // Si aún no se encuentra, buscar cualquier detalle que contenga este ID
                        if (!$detalle) {
                            $detalle = \App\Models\Detalle::where('idShopify', 'LIKE', "%{$shopifyId}%")->first();
                        }
                        
                        if ($detalle && $detalle->producto_id) {
                            // Buscar el producto usando el producto_id del detalle
                            $product = \App\Models\Producto::find($detalle->producto_id);
                        }
                        
                        // Estrategia 2: Si no se encontró por idShopify, intentar buscar directamente
                        // El ID del producto puede tener un cero al inicio (ej: 07422442106)
                        if (!$product) {
                            // Intentar con el ID tal cual
                            $product = \App\Models\Producto::find((string) $item->product_id);
                            
                            // Si no se encuentra, intentar con un cero al inicio
                            if (!$product) {
                                $productIdWithZero = '0' . (string) $item->product_id;
                                $product = \App\Models\Producto::find($productIdWithZero);
                            }
                            
                            // Si aún no se encuentra, intentar con padding a 6 dígitos (para IDs cortos)
                            if (!$product) {
                                $productIdNormalized = str_pad((string) $item->product_id, 6, '0', STR_PAD_LEFT);
                                $product = \App\Models\Producto::find($productIdNormalized);
                            }
                            
                            // Si aún no se encuentra, buscar con LIKE (para IDs que contengan el product_id)
                            if (!$product) {
                                $product = \App\Models\Producto::where('id', 'LIKE', '%' . $item->product_id . '%')->first();
                            }
                        }
                        
                        // Obtener precio original del producto
                        $originalPrice = $product ? (float) ($product->precio1 ?? 0) : null;
                        
                        // Calcular descuento: comparar precio original con precio pagado
                        // Siempre mostrar precio original si existe, incluso si no hay descuento
                        $hasDiscount = false;
                        $discountPercentage = 0;
                        
                        if ($originalPrice && $originalPrice > 0) {
                            // Hay descuento si el precio pagado es menor al precio original
                            if ($originalPrice > $item->price) {
                                $hasDiscount = true;
                                $discountPercentage = round((($originalPrice - $item->price) / $originalPrice) * 100);
                            }
                        }

                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'title' => $item->name ?? 'Producto',
                            'quantity' => (int) $item->quantity,
                            'price' => (float) $item->price,
                            'original_price' => $originalPrice, // Siempre incluir precio original si existe
                            'has_discount' => $hasDiscount,
                            'discount_percentage' => $hasDiscount ? $discountPercentage : 0,
                            'subtotal' => (float) $item->subtotal,
                            'image' => $this->getProductImageUrl($item->product_id),
                            'size' => $item->size,
                            'color' => $item->color,
                            'barcode' => $item->barcode
                        ];
                    }),
                    'address' => $order->address ? [
                        'street_address' => $order->address->street_address,
                        'city' => $order->address->city,
                        'municipality' => $order->address->municipality,
                        'state' => $order->address->state,
                        'postal_code' => $order->address->postal_code,
                        'country' => $order->address->country,
                        'additional_info' => $order->address->additional_info,
                        'name' => $order->address->name
                    ] : null,
                    'credit_used' => (float) ($order->credit_used ?? 0),
                    'amount_paid' => (float) ($order->amount_paid ?? $order->total_amount),
                    'amount_pending' => (float) ($order->amount_pending ?? 0),
                    'paid_with_credit' => (bool) ($order->paid_with_credit ?? false)
                ];
            });

            return response()->json([
                'success' => true,
                'orders' => $formattedOrders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las órdenes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order status
     */
    public function updateStatus(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,pagado,en_espera_envio,enviado,cancelled,failed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Datos de validación incorrectos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $order = Order::with('user')->findOrFail($orderId);
            $oldStatus = $order->status;
            $newStatus = $request->status;

            // Actualizar el estado
            $order->status = $newStatus;
            
            // Si el estado es enviado, notificar al cliente que puede calificar
            if ($newStatus === 'enviado') {
                // El cliente ahora puede calificar los productos
                $this->notifyCustomerCanRate($order);
            }

            $order->save();

            // Notificar al cliente sobre el cambio de estado
            $this->notifyCustomerStatusChange($order, $oldStatus, $newStatus);


            // Si el estado es 'pagado', notificar al admin (esto se manejará con notificaciones)
            if ($newStatus === 'pagado') {
                $this->notifyAdminPaymentReceived($order);
            }

            return response()->json([
                'success' => true,
                'message' => 'Estado de la orden actualizado correctamente',
                'statusDisplay' => $this->mapOrderStatus($newStatus),
                'order' => [
                    'id' => $order->id,
                    'status' => $newStatus,
                    'statusDisplay' => $this->mapOrderStatus($newStatus)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific order details
     */
    public function show($orderId)
    {
        try {
            $order = Order::with(['user', 'items.product', 'address'])->findOrFail($orderId);

            // Calcular costo de envío
            $paymentData = is_array($order->payment_data) ? $order->payment_data : (is_string($order->payment_data) ? json_decode($order->payment_data, true) : []);
            $deliveryType = $paymentData['delivery_type'] ?? 'envio';
            
            // Calcular subtotal de productos
            $subtotalProducts = $order->items->sum('subtotal');
            
            // Calcular costo de envío
            $shippingCost = 0;
            if (isset($paymentData['shipping_amount'])) {
                $shippingCost = (float) $paymentData['shipping_amount'];
            } else {
                // Calcular como diferencia entre total_amount y subtotal de productos
                $totalAmount = (float) $order->total_amount;
                if ($totalAmount > $subtotalProducts) {
                    $shippingCost = $totalAmount - $subtotalProducts;
                }
            }
            
            // Si es retiro en tienda, el costo de envío es 0
            if ($deliveryType === 'retiro') {
                $shippingCost = 0;
            }

            $formattedOrder = [
                'id' => $order->id,
                'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                'date' => $order->created_at->format('d \d\e F Y'),
                'status' => $order->status,
                'statusDisplay' => $this->mapOrderStatus($order->status),
                'totalAmount' => (float) $order->total_amount,
                'shipping_cost' => (float) $shippingCost,
                'paymentMethod' => ucfirst($order->payment_method),
                'paymentId' => $order->mercadopago_payment_id,
                'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                'customerEmail' => $order->user ? $order->user->email : 'N/A',
                'customerPhone' => $order->user ? $order->user->phone : null,
                'customerFirstName' => $order->user ? $order->user->first_name : null,
                'customerLastName' => $order->user ? $order->user->last_name : null,
                'customerMiddleName' => $order->user ? $order->user->middle_name : null,
                'created_at' => $order->created_at->toISOString(),
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'title' => $item->name ?? 'Producto',
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->price,
                        'subtotal' => (float) $item->subtotal,
                        'image' => $this->getProductImageUrl($item->product_id),
                        'size' => $item->size,
                        'color' => $item->color,
                        'barcode' => $item->barcode
                    ];
                }),
                'address' => $order->address ? [
                    'street_address' => $order->address->street_address,
                    'city' => $order->address->city,
                    'municipality' => $order->address->municipality,
                    'state' => $order->address->state,
                    'postal_code' => $order->address->postal_code,
                    'country' => $order->address->country,
                    'additional_info' => $order->address->additional_info,
                        'name' => $order->address->name
                    ] : null,
                    'credit_used' => (float) ($order->credit_used ?? 0),
                    'amount_paid' => (float) ($order->amount_paid ?? $order->total_amount),
                    'amount_pending' => (float) ($order->amount_pending ?? 0),
                    'paid_with_credit' => (bool) ($order->paid_with_credit ?? false)
                ];

            return response()->json([
                'success' => true,
                'order' => $formattedOrder
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la orden: ' . $e->getMessage()
            ], 404);
        }
    }

    /**
     * Map order status to display text
     */
    private function mapOrderStatus($status)
    {
        $statusMap = [
            'pending' => 'Pendiente',
            'processing' => 'Procesando',
            'shipped' => 'En vía',
            'delivered' => 'Entregado',
            'cancelled' => 'Cancelado',
            'failed' => 'Fallido',
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En espera de envío',
            'enviado' => 'Enviado',
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }

    /**
     * Get product image URL based on product ID
     * Uses the same logic as frontend productImageUtils.js
     * Simply constructs the URL without HTTP verification (let browser handle fallback)
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }
        
        // Convertir a string para manejar correctamente
        $productIdStr = (string) $productId;
        
        // Construir URL directamente como en el frontend
        // El frontend usa: https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }

    /**
     * Notify customer about status change
     */
    private function notifyCustomerStatusChange($order, $oldStatus, $newStatus)
    {
        try {
            // Crear notificación en la base de datos
            Notification::createOrderStatusNotification($order, $oldStatus, $newStatus);
            
            // TODO: Implementar sistema de notificaciones por email/SMS
            // Por ahora solo logging
            
            if ($newStatus === 'en_espera_envio') {
                // Notificar al cliente que su pedido está en espera de envío
            } elseif ($newStatus === 'enviado') {
                // Notificar al cliente que su pedido ha sido enviado
                // Habilitar opción para marcar como recibido
            }
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

    /**
     * Notify admin about new payment
     */
    private function notifyAdminPaymentReceived($order)
    {
        // TODO: Implementar notificación al admin
        // Por ahora solo logging
    }

    /**
     * Notify customer that they can rate their order
     */
    private function notifyCustomerCanRate($order)
    {
        try {
            // Crear notificación para el cliente
            $order->user->notifications()->create([
                'title' => '¡Tu pedido ha sido enviado!',
                'message' => 'Tu pedido #' . $order->id . ' ha sido enviado. Ahora puedes calificar y comentar sobre los productos.',
                'type' => 'order_shipped',
                'data' => [
                    'order_id' => $order->id,
                    'can_rate' => true
                ]
            ]);
        } catch (\Exception $e) {
            // Error silencioso
        }
    }

}
