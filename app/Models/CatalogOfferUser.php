<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatalogOfferUser extends Model
{
    protected $fillable = [
        'offer_id',
        'user_id'
    ];

    /**
     * Get the catalog offer that owns this user relationship
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(CatalogOffer::class, 'offer_id');
    }

    /**
     * Get the user that owns this offer relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
