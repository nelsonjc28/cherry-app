<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrderedCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'display_order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Relación con la categoría
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Scope para categorías activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para ordenar por display_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    /**
     * Obtener todas las categorías ordenadas con sus datos
     */
    public static function getOrderedCategories()
    {
        return self::with('category')
            ->active()
            ->ordered()
            ->get()
            ->pluck('category')
            ->filter(); // Filtrar categorías que puedan haber sido eliminadas
    }
}
