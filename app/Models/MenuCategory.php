<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer'
    ];

    /**
     * Relación con la categoría
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Obtener categorías del menú ordenadas
     */
    public static function getOrderedCategories()
    {
        return self::with('category')
            ->where('is_active', true)
            ->orderBy('order')
            ->get()
            ->pluck('category');
    }

    /**
     * Actualizar el orden de las categorías del menú
     */
    public static function updateOrder($categoryIds)
    {
        foreach ($categoryIds as $index => $categoryId) {
            self::where('category_id', $categoryId)->update(['order' => $index]);
        }
    }
}


