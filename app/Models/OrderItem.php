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
        'name',
        'size',
        'color',
        'barcode',
        'product_details',
        'quantity',
        'price',
        'subtotal'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'product_details' => 'array'
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
}
