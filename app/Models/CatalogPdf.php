<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CatalogPdf extends Model
{
    use HasFactory;

    protected $table = 'catalog_pdfs';

    protected $fillable = [
        'catalog_id',
        'image_group_id',
        'catalog_name',
        'image_path',
        'image_name',
        'image_size',
        'image_mime_type',
        'image_alt',
        'width',
        'height',
        'thumbnail_path',
        'display_order'
    ];

    protected $casts = [
        'display_order' => 'integer',
        'width' => 'integer',
        'height' => 'integer'
    ];

    /**
     * Obtener el catálogo al que pertenece
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Obtener el grupo de imágenes al que pertenece
     */
    public function imageGroup()
    {
        return $this->belongsTo(CatalogImageGroup::class, 'image_group_id');
    }

    /**
     * Obtener la URL completa de la imagen
     */
    public function getImageUrlAttribute()
    {
        // Si la imagen está en la carpeta public/catalog-images, usar esa ruta
        if (strpos($this->image_path, 'catalog-images/') === 0) {
            return asset($this->image_path);
        }
        // Si está en storage, usar el enlace simbólico
        return asset('storage/' . $this->image_path);
    }

    /**
     * Obtener la URL completa del thumbnail
     */
    public function getThumbnailUrlAttribute()
    {
        if (!$this->thumbnail_path) return null;
        
        // Si el thumbnail está en la carpeta public/catalog-images/thumbnails, usar esa ruta
        if (strpos($this->thumbnail_path, 'catalog-images/thumbnails/') === 0) {
            return asset($this->thumbnail_path);
        }
        // Si está en storage, usar el enlace simbólico
        return asset('storage/' . $this->thumbnail_path);
    }

    /**
     * Obtener el tamaño de la imagen en formato legible
     */
    public function getFormattedSizeAttribute()
    {
        if (!$this->image_size) return 'N/A';
        
        $size = (int) $this->image_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, 2) . ' ' . $units[$i];
    }

    /**
     * Verificar si la imagen existe
     */
    public function imageExists()
    {
        return file_exists(storage_path('app/public/' . $this->image_path));
    }

    /**
     * Verificar si el thumbnail existe
     */
    public function thumbnailExists()
    {
        if (!$this->thumbnail_path) return false;
        return file_exists(storage_path('app/public/' . $this->thumbnail_path));
    }

    /**
     * Obtener las dimensiones de la imagen en formato string
     */
    public function getDimensionsAttribute()
    {
        if (!$this->width || !$this->height) return 'N/A';
        return $this->width . 'x' . $this->height;
    }
}







