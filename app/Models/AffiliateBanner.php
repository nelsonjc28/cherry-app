<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliateBanner extends Model
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
        'title', 'subtitle', 'button_text', 'button_url', 'image_path', 'is_active', 'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    public static function getActiveBanner()
    {
        return self::active()->ordered()->first();
    }
}