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
        'user_id',
        'address_id',
        'total_amount',
        'status',
        'payment_method',
        'external_reference',
        'mercadopago_preference_id',
        'mercadopago_payment_id',
        'payment_data',
        'delivered_at'
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
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
            'pagado' => 'Pagado',
            'en_espera_envio' => 'En Espera de Envío',
            'enviado' => 'Enviado',
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
            'pagado' => ['en_espera_envio'],
            'en_espera_envio' => ['enviado'],
            'enviado' => [], // Estado final - cliente puede calificar
            default => []
        };
    }
}
