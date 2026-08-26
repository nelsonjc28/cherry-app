<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliatePromoBanner extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        $deactivateOthers = function (self $banner) {
            if ($banner->is_active) {
                $query = self::query();
                if ($banner->exists) {
                    $query->where('id', '<>', $banner->getKey());
                }
                $query->update(['is_active' => false]);
            }
        };

        static::saving($deactivateOthers);
        static::updating($deactivateOthers);
    }

    protected $fillable = [
        'image_path', 'button_url', 'is_active', 'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean', 'display_order' => 'integer'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    public static function getActivePromoBanners()
    {
        return self::active()->ordered()->get();
    }
}