<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CategoryProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'external_product_id',
        'product_name',
        'product_description',
        'product_price',
        'product_category',
        'product_metadata',
        'display_order'
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'product_metadata' => 'array',
        'display_order' => 'integer'
    ];

    /**
     * Obtener la categoría a la que pertenece
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Verificar si un producto externo ya está en alguna categoría
     */
    public static function isProductInAnyCategory($externalProductId)
    {
        return static::where('external_product_id', $externalProductId)->exists();
    }

    /**
     * Obtener productos que no están en ninguna categoría
     */
    public static function getAvailableProducts($externalProducts)
    {
        $categoryProductIds = static::pluck('external_product_id')->toArray();
        
        return collect($externalProducts)->filter(function ($product) use ($categoryProductIds) {
            // La API externa usa 'id_articulo' como identificador único
            return !in_array($product['id_articulo'], $categoryProductIds);
        });
    }
}
