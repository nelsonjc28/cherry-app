<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogPdfImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'image_path',
        'image_name',
        'display_order'
    ];

    protected $casts = [
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
     * Obtener la URL completa de la imagen
     */
    public function getImageUrlAttribute()
    {
        return asset('storage/' . $this->image_path);
    }
}
