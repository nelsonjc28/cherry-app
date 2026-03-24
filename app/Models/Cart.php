<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cart extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'items',
        'total_items',
        'total_price',
        'coupon_code',
        'discount',
        'last_notified_at',
    ];

    protected $casts = [
        'items' => 'array',
        'total_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'last_notified_at' => 'datetime',
    ];

    /**
     * Get the user that owns the cart.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
