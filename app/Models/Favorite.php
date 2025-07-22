<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'product_title',
        'product_image',
        'product_price'
    ];

    protected $casts = [
        'product_price' => 'decimal:2'
    ];

    /**
     * Relación con el usuario
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Verificar si un producto está en favoritos del usuario
     */
    public static function isFavorited($userId, $productId)
    {
        return self::where('user_id', $userId)
                   ->where('product_id', $productId)
                   ->exists();
    }

    /**
     * Obtener favoritos de un usuario
     */
    public static function getUserFavorites($userId)
    {
        return self::where('user_id', $userId)
                   ->orderBy('created_at', 'desc')
                   ->get();
    }

    /**
     * Agregar a favoritos
     */
    public static function addToFavorites($userId, $productData)
    {
        return self::updateOrCreate(
            [
                'user_id' => $userId,
                'product_id' => $productData['product_id']
            ],
            [
                'product_title' => $productData['product_title'] ?? null,
                'product_image' => $productData['product_image'] ?? null,
                'product_price' => $productData['product_price'] ?? null
            ]
        );
    }

    /**
     * Remover de favoritos
     */
    public static function removeFromFavorites($userId, $productId)
    {
        return self::where('user_id', $userId)
                   ->where('product_id', $productId)
                   ->delete();
    }
}
