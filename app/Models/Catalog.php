<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Catalog extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'image',
        'is_active',
        'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Obtener las imágenes del catálogo PDF
     */
    public function pdfImages()
    {
        return $this->hasMany(CatalogPdfImage::class)->orderBy('display_order');
    }

    /**
     * Obtener los productos del catálogo
     */
    public function products()
    {
        return $this->hasMany(CatalogProduct::class)->orderBy('display_order');
    }

    /**
     * Obtener las ofertas del catálogo
     */
    public function offers()
    {
        return $this->hasMany(CatalogOffer::class)->orderBy('display_order');
    }

    /**
     * Obtener catálogos activos ordenados
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('display_order');
    }

    /**
     * Obtener catálogos ordenados por orden de visualización
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }
}
