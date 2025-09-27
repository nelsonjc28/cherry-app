<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatalogOfferProduct extends Model
{
    protected $fillable = [
        'offer_id',
        'product_id',
        'product_name',
        'product_price',
        'product_image',
        'product_description'
    ];

    /**
     * Get the catalog offer that owns this product relationship
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(CatalogOffer::class, 'offer_id');
    }
}
