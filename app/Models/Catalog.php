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
        'code',
        'image',
        'is_active',
        'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    protected $appends = [
        'image_url'
    ];

    /**
     * Obtener los PDFs del catálogo
     */
    public function pdfs()
    {
        return $this->hasMany(CatalogPdf::class)->orderBy('display_order');
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
     * Obtener los grupos de imágenes del catálogo
     */
    public function imageGroups()
    {
        return $this->hasMany(CatalogImageGroup::class)->orderBy('display_order');
    }

    /**
     * Obtener los grupos de imágenes activos del catálogo
     */
    public function activeImageGroups()
    {
        return $this->hasMany(CatalogImageGroup::class)->active()->ordered();
    }

    /**
     * Obtener catálogos activos ordenados
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Obtener catálogos ordenados por código (ascendente)
     */
    public function scopeOrdered($query)
    {
        return $query->orderByRaw('CAST(code AS UNSIGNED) ASC');
    }

    /**
     * Obtener la URL completa de la imagen del catálogo
     */
    public function getImageUrlAttribute()
    {
        if (!$this->image) {
            return asset('images/placeholder-catalog.png');
        }
        
        // Si la imagen está en la carpeta public/catalogs, usar esa ruta
        if (strpos($this->image, 'catalogs/') === 0) {
            return asset($this->image);
        }
        
        // Si está en storage, usar el enlace simbólico
        return asset('storage/' . $this->image);
    }
}
