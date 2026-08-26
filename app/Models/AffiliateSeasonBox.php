<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliateSeasonBox extends Model
{
    use HasFactory;

    protected $fillable = [
        'affiliate_season_id',
        'title',
        'description',
        'button_text',
        'button_url',
        'image_path',
        'is_active',
        'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    public function season()
    {
        return $this->belongsTo(AffiliateSeason::class, 'affiliate_season_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }
}
