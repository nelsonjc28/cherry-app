<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliateSeason extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'catalog_id', 'is_active', 'display_order'];

    protected $casts = ['is_active' => 'boolean', 'display_order' => 'integer'];

    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    public function boxes()
    {
        return $this->hasMany(AffiliateSeasonBox::class)->ordered();
    }

    public function activeBoxes()
    {
        return $this->hasMany(AffiliateSeasonBox::class)->active()->ordered();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    public static function getActiveSeason()
    {
        return self::active()->ordered()->first();
    }
}