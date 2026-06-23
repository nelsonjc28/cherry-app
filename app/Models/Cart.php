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
        'abandoned_email_stage',
        'abandonment_started_at',
    ];

    protected $casts = [
        'items' => 'array',
        'total_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'last_notified_at' => 'datetime',
        'abandonment_started_at' => 'datetime',
    ];

    public function resetAbandonmentCampaign(): void
    {
        $this->forceFill([
            'abandoned_email_stage' => 0,
            'last_notified_at' => null,
            'abandonment_started_at' => null,
        ])->save();
    }

    public function startAbandonmentCampaignIfNeeded(): void
    {
        if ($this->total_items <= 0) {
            return;
        }

        if ($this->abandonment_started_at === null) {
            $this->forceFill([
                'abandonment_started_at' => now(),
                'abandoned_email_stage' => 0,
                'last_notified_at' => null,
            ])->save();
        }
    }

    /**
     * Get the user that owns the cart.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
