<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'external_product_id',
        'product_name',
        'product_description',
        'product_image',
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
     * Obtener el catálogo al que pertenece
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Obtener la URL completa de la imagen del producto
     */
    public function getProductImageUrlAttribute()
    {
        if ($this->product_image) {
            return asset('storage/' . $this->product_image);
        }
        return null;
    }

    /**
     * Verificar si un producto externo ya está en algún catálogo
     */
    public static function isProductInAnyCatalog($externalProductId)
    {
        return static::where('external_product_id', $externalProductId)->exists();
    }

    /**
     * Obtener productos que no están en ningún catálogo
     */
    public static function getAvailableProducts($externalProducts)
    {
        $catalogProductIds = static::pluck('external_product_id')->toArray();
        
        return collect($externalProducts)->filter(function ($product) use ($catalogProductIds) {
            // La API externa usa 'id_articulo' como identificador único
            return !in_array($product['id_articulo'], $catalogProductIds);
        });
    }
}
