<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Rating extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'rating',
        'comment',
        'is_approved'
    ];

    protected $casts = [
        'rating' => 'integer',
        'is_approved' => 'boolean'
    ];

    /**
     * Relación con el usuario
     */
    public function user()
    {
        return $this->belongsTo(User::class)->select(['id', 'first_name', 'last_name', 'middle_name']);
    }

    /**
     * Obtener calificación promedio de un producto
     */
    public static function getAverageRating($productId)
    {
        $ratings = self::where('product_id', $productId)
                       ->where('is_approved', true)
                       ->get();

        if ($ratings->isEmpty()) {
            return [
                'average' => 0,
                'count' => 0,
                'distribution' => [0, 0, 0, 0, 0]
            ];
        }

        $average = $ratings->avg('rating');
        $count = $ratings->count();
        
        // Distribución de calificaciones (1-5 estrellas)
        $distribution = [];
        for ($i = 1; $i <= 5; $i++) {
            $distribution[] = $ratings->where('rating', $i)->count();
        }

        return [
            'average' => round($average, 1),
            'count' => $count,
            'distribution' => $distribution
        ];
    }

    /**
     * Obtener calificación del usuario para un producto
     */
    public static function getUserRating($userId, $productId)
    {
        return self::where('user_id', $userId)
                   ->where('product_id', $productId)
                   ->first();
    }

    /**
     * Obtener todas las calificaciones de un producto
     */
    public static function getProductRatings($productId, $limit = 10)
    {
        return self::where('product_id', $productId)
                   ->where('is_approved', true)
                   ->with('user')
                   ->orderBy('created_at', 'desc')
                   ->limit($limit)
                   ->get();
    }

    /**
     * Agregar o actualizar calificación
     */
    public static function addOrUpdateRating($userId, $productId, $rating, $comment = null)
    {
        return self::updateOrCreate(
            [
                'user_id' => $userId,
                'product_id' => $productId
            ],
            [
                'rating' => $rating,
                'comment' => $comment,
                'is_approved' => true
            ]
        );
    }

    /**
     * Verificar si el usuario ya calificó el producto
     */
    public static function hasUserRated($userId, $productId)
    {
        return self::where('user_id', $userId)
                   ->where('product_id', $productId)
                   ->exists();
    }

    /**
     * Obtener calificaciones de múltiples productos de una vez
     */
    public static function getMultipleProductsRatings($productIds)
    {
        $ratings = self::whereIn('product_id', $productIds)
                       ->where('is_approved', true)
                       ->select('product_id', DB::raw('AVG(rating) as average_rating'), DB::raw('COUNT(*) as rating_count'))
                       ->groupBy('product_id')
                       ->get()
                       ->keyBy('product_id');

        $result = [];
        foreach ($productIds as $productId) {
            if ($ratings->has($productId)) {
                $rating = $ratings->get($productId);
                $result[$productId] = [
                    'average' => round($rating->average_rating, 1),
                    'count' => $rating->rating_count
                ];
            } else {
                $result[$productId] = [
                    'average' => 0,
                    'count' => 0
                ];
            }
        }

        return $result;
    }
}
