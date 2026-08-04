<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'detalle_id',
        'name',
        'size',
        'color',
        'barcode',
        'product_details',
        'quantity',
        'price',
        'subtotal',
        'is_delivered',
        'delivered_at'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'product_details' => 'array',
        'is_delivered' => 'boolean',
        'delivered_at' => 'datetime'
    ];

    /**
     * Get the order that owns the item.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the product associated with this order item.
     * Note: Producto model uses string ID, but product_id is stored as integer.
     * Laravel should handle the conversion, but we ensure it works by using a custom query.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'product_id', 'id');
    }

    /**
     * Variante talla/color en tabla detalles (idArtd).
     */
    public function detalleRow(): BelongsTo
    {
        return $this->belongsTo(Detalle::class, 'detalle_id', 'id');
    }

    /**
     * Marca este ítem como entregado individualmente.
     */
    public function markAsDelivered(): void
    {
        $this->forceFill([
            'is_delivered' => true,
            'delivered_at' => now(),
        ])->save();
    }

    /**
     * Revierte la entrega de este ítem (queda pendiente).
     */
    public function markAsPending(): void
    {
        $this->forceFill([
            'is_delivered' => false,
            'delivered_at' => null,
        ])->save();
    }

    /**
     * Etiqueta legible del estado de entrega del ítem.
     */
    public function getDeliveryStatusLabelAttribute(): string
    {
        return $this->is_delivered ? 'Entregado' : 'Pendiente';
    }
}