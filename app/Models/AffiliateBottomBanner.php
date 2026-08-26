<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliateBottomBanner extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (self $banner) {
            if ($banner->is_active) {
                $query = self::query();
                if ($banner->exists) {
                    $query->where('id', '<>', $banner->getKey());
                }
                $query->update(['is_active' => false]);
            }
        });
    }

    protected $fillable = [
        'image_path', 'button_url', 'display_order', 'is_active'
    ];

    protected $casts = [
        'display_order' => 'integer', 'is_active' => 'boolean'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function getActiveBottomBanner()
    {
        return self::active()->first();
    }
}
