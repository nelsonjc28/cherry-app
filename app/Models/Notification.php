<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'target_user_role',
        'target_user_id',
        'related_order_id'
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the user that this notification targets (if specific)
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * Get the order related to this notification
     */
    public function relatedOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'related_order_id');
    }

    /**
     * Scope to get unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope to get notifications for admin
     */
    public function scopeForAdmin($query)
    {
        return $query->where('target_user_role', 'admin');
    }

    /**
     * Scope to get notifications for specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('target_user_id', $userId);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead()
    {
        $this->update(['is_read' => true]);
    }

    /**
     * Create a notification for admin when payment is received
     */
    public static function createPaymentNotification($order)
    {
        return self::create([
            'type' => 'payment_received',
            'title' => 'Nuevo Pago Recibido',
            'message' => "Se ha recibido un pago de {$order->user->first_name} {$order->user->last_name} por $" . number_format($order->total_amount, 2),
            'data' => [
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'amount' => $order->total_amount,
                'payment_method' => $order->payment_method
            ],
            'target_user_role' => 'admin',
            'related_order_id' => $order->id
        ]);
    }

    /**
     * Create a notification for user when order status changes
     */
    public static function createOrderStatusNotification($order, $oldStatus, $newStatus)
    {
        $statusMessages = [
            'en_espera_envio' => 'Tu pedido está siendo preparado para el envío',
            'enviado' => 'Tu pedido ha sido enviado y puedes calificar los productos'
        ];

        $message = $statusMessages[$newStatus] ?? "El estado de tu pedido ha cambiado a {$newStatus}";

        return self::create([
            'type' => 'order_status_changed',
            'title' => 'Estado de Pedido Actualizado',
            'message' => $message,
            'data' => [
                'order_id' => $order->id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'order_number' => str_pad($order->id, 8, '0', STR_PAD_LEFT)
            ],
            'target_user_role' => 'user',
            'target_user_id' => $order->user_id,
            'related_order_id' => $order->id
        ]);
    }

    /**
     * Create notification for user when a product they're interested in becomes available
     */
    public static function createProductAvailableNotification($userId, $productId, $productTitle)
    {
        return self::create([
            'type' => 'product_available',
            'title' => '¡Producto Disponible!',
            'message' => "El producto '{$productTitle}' ya está disponible. ¡Agrégalo a tu carrito!",
            'data' => [
                'product_id' => $productId,
                'product_title' => $productTitle
            ],
            'target_user_role' => 'user',
            'target_user_id' => $userId,
            'related_order_id' => null
        ]);
    }

    /**
     * Create an admin notification when an order fails to send to the external API.
     * The notification links to the order detail via related_order_id.
     */
    public static function createExternalApiFailure($order, string $error, string $origen = 'sistema')
    {
        $orderId = is_object($order) ? $order->id : $order;

        return self::create([
            'type' => 'external_api_sync_failed',
            'title' => 'Fallo envío a API externa',
            'message' => "La orden #{$orderId} no se pudo enviar a la API externa: {$error}",
            'data' => [
                'order_id' => $orderId,
                'origen' => $origen,
                'error' => $error,
                'order_number' => str_pad((string) $orderId, 8, '0', STR_PAD_LEFT)
            ],
            'target_user_role' => 'admin',
            'related_order_id' => $orderId
        ]);
    }
}
