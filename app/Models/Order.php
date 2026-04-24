<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_group_id',
        'user_id',
        'address_id',
        'total_amount',
        'subtotal',
        'discounted_total',
        'shipping_amount',
        'descuento1',
        'descuento2',
        'credit_used',
        'amount_paid',
        'amount_pending',
        'paid_with_credit',
        'is_advance_order',
        'status',
        'fulfillment_email_last_status',
        'is_prepared',
        'tracking_number',
        'payment_method',
        'external_reference',
        'mercadopago_preference_id',
        'mercadopago_payment_id',
        'payment_data',
        'delivered_at'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'discounted_total' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'descuento1' => 'decimal:2',
        'descuento2' => 'decimal:2',
        'credit_used' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'amount_pending' => 'decimal:2',
        'paid_with_credit' => 'boolean',
        'is_advance_order' => 'boolean',
        'is_prepared' => 'boolean',
        'payment_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'delivered_at' => 'datetime'
    ];

    /**
     * Get the user that owns the order.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the address for the order.
     */
    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class);
    }

    /**
     * Etiqueta de método de entrega para admin y APIs.
     * Con address_id → envío; sin address_id → retiro en tienda.
     */
    public function getShippingMethodLabelAttribute(): string
    {
        return $this->address_id !== null
            ? 'Envío a Domicilio'
            : 'Retiro en Tienda';
    }

    /**
     * Get the order items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the status display name.
     */
    public function getStatusDisplayAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Pendiente',
            'pendiente_pago' => 'Por Pagar',
            'pending_payment' => 'Por Pagar',
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En Espera de Envío',
            'enviado' => 'Enviado',
            'entregado' => 'Entregado',
            'pago_rechazado' => 'Pago Rechazado',
            'cancelado' => 'Cancelado',
            // Estados legacy
            'processing' => 'Procesando',
            'completed' => 'Completado',
            'failed' => 'Fallido',
            'cancelled' => 'Cancelado',
            default => 'Desconocido'
        };
    }

    /**
     * Check if order is paid.
     */
    public function isPaid(): bool
    {
        return in_array($this->status, ['pagado', 'en_espera_envio', 'enviado', 'completed']);
    }

    /**
     * Check if order payment is pending.
     */
    public function isPaymentPending(): bool
    {
        return in_array($this->status, ['pendiente_pago', 'pending_payment', 'pending'], true);
    }

    /**
     * Check if order is delivered (now based on 'enviado' status).
     */
    public function isDelivered(): bool
    {
        return $this->status === 'enviado';
    }

    /**
     * Check if order can be rated by customer.
     */
    public function canBeRated(): bool
    {
        return $this->status === 'enviado';
    }

    /**
     * Check if order can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    /**
     * Get next possible statuses for admin.
     */
    public function getNextPossibleStatuses(): array
    {
        return match($this->status) {
            'pendiente_pago' => ['pagado', 'cancelado', 'cancelled'],
            'pending_payment' => ['pagado', 'cancelado', 'cancelled'],
            'pagado' => ['en_espera_envio'],
            'en_espera_envio' => ['enviado'],
            'enviado' => [], // Estado final - cliente puede calificar
            default => []
        };
    }
}
