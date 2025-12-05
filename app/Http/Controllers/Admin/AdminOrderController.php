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
                return [
                    'id' => $order->id,
                    'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                    'date' => $order->created_at->format('d \d\e F Y'),
                    'status' => $order->status,
                    'statusDisplay' => $this->mapOrderStatus($order->status),
                    'totalAmount' => (float) $order->total_amount,
                    'paymentMethod' => ucfirst($order->payment_method),
                    'paymentId' => $order->mercadopago_payment_id,
                    'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                    'customerEmail' => $order->user ? $order->user->email : 'N/A',
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
                        'street' => $order->address->street_address,
                        'city' => $order->address->city,
                        'state' => $order->address->state,
                        'postal_code' => $order->address->postal_code
                    ] : null
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

            $formattedOrder = [
                'id' => $order->id,
                'orderNumber' => str_pad($order->id, 8, '0', STR_PAD_LEFT),
                'date' => $order->created_at->format('d \d\e F Y'),
                'status' => $order->status,
                'statusDisplay' => $this->mapOrderStatus($order->status),
                'totalAmount' => (float) $order->total_amount,
                'paymentMethod' => ucfirst($order->payment_method),
                'paymentId' => $order->mercadopago_payment_id,
                'customerName' => $order->user ? $order->user->first_name . ' ' . $order->user->last_name : 'Usuario eliminado',
                'customerEmail' => $order->user ? $order->user->email : 'N/A',
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
                    'street' => $order->address->street_address,
                    'city' => $order->address->city,
                    'state' => $order->address->state,
                    'postal_code' => $order->address->postal_code
                ] : null
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
