<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'order_id',
        'product_id',
        'product_name',
        'rating',
        'comment',
        'images',
        'is_approved',
        'is_featured'
    ];

    protected $casts = [
        'images' => 'array',
        'is_approved' => 'boolean',
        'is_featured' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    protected $attributes = [
        'is_approved' => null, // Por defecto las reseñas están pendientes
        'is_featured' => false
    ];

    /**
     * Get the user that wrote this review
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order this review belongs to
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Scope to get approved reviews
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope to get featured reviews
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to get reviews for specific product
     */
    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope to get reviews with specific rating
     */
    public function scopeWithRating($query, $rating)
    {
        return $query->where('rating', $rating);
    }

    /**
     * Get average rating for a product
     */
    public static function getAverageRating($productId)
    {
        return self::forProduct($productId)->approved()->avg('rating') ?: 0;
    }

    /**
     * Get rating distribution for a product
     */
    public static function getRatingDistribution($productId)
    {
        $reviews = self::forProduct($productId)->approved()->get();
        $total = $reviews->count();
        
        if ($total === 0) {
            return [
                'average' => 0,
                'total' => 0,
                'distribution' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]
            ];
        }
        
        $distribution = [];
        for ($i = 1; $i <= 5; $i++) {
            $count = $reviews->where('rating', $i)->count();
            $distribution[$i] = [
                'count' => $count,
                'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0
            ];
        }
        
        return [
            'average' => round($reviews->avg('rating'), 1),
            'total' => $total,
            'distribution' => $distribution
        ];
    }

    /**
     * Get formatted rating display
     */
    public function getFormattedRatingAttribute()
    {
        return str_repeat('★', $this->rating) . str_repeat('☆', 5 - $this->rating);
    }
}
