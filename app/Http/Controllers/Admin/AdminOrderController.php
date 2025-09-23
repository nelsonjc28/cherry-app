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
            $orders = Order::with(['user', 'items', 'address'])
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
                            'image' => $this->getProductImageUrl($item->product_id)
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
            'status' => 'required|string|in:pending,pagado,en_espera_envio,enviado,entregado,cancelled,failed'
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
            
            // Si el estado es entregado, actualizar la fecha
            if ($newStatus === 'entregado') {
                $order->delivered_at = now();
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
            $order = Order::with(['user', 'items', 'address'])->findOrFail($orderId);

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
                        'image' => $this->getProductImageUrl($item->product_id)
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
            'entregado' => 'Entregado'
        ];

        return $statusMap[$status] ?? ucfirst($status);
    }

    /**
     * Get product image URL based on product ID
     * Uses the same logic as PaymentController
     */
    private function getProductImageUrl($productId)
    {
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }
        
        // Primero probar con el ID original (sin ceros)
        $originalUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$productId}/{$productId}_1.jpg";
        
        // Verificar rápidamente si la imagen original existe
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $originalUrl);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Si la imagen original existe, usarla
        if ($httpCode === 200) {
            return $originalUrl;
        }
        
        // Si no existe, probar con formato con ceros a la izquierda
        $formattedId = str_pad($productId, 11, '0', STR_PAD_LEFT);
        $formattedUrl = "https://cherry-fotos.s3.amazonaws.com/shopify/{$formattedId}/{$formattedId}_1.jpg";
        
        // Verificar si la imagen formateada existe
        $ch2 = curl_init();
        curl_setopt($ch2, CURLOPT_URL, $formattedUrl);
        curl_setopt($ch2, CURLOPT_NOBODY, true);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
        
        curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);
        
        // Si la imagen formateada existe, usarla
        if ($httpCode2 === 200) {
            return $formattedUrl;
        }
        
        // Si ninguna existe, devolver la original (será manejada por el fallback del frontend)
        return $originalUrl;
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
}
