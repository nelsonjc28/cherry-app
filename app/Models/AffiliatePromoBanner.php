<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AffiliatePromoBanner extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'description', 'image_path', 'button_text', 'button_url',
        'start_date', 'end_date', 'is_active', 'display_order'
    ];

    protected $casts = [
        'start_date' => 'date', 'end_date' => 'date',
        'is_active' => 'boolean', 'display_order' => 'integer'
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrent($query)
    {
        $today = now()->toDateString();
        return $query->where(fn($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $today))
            ->where(fn($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today));
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    public static function getActivePromoBanners()
    {
        return self::active()->current()->ordered()->get();
    }
}