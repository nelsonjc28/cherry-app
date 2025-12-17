<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CatalogImageGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'name',
        'description',
        'slug',
        'is_active',
        'display_order',
        'pdf_path',
        'pdf_name'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Boot del modelo para generar slug automáticamente
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    /**
     * Obtener el catálogo al que pertenece este grupo
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Obtener las imágenes de este grupo
     */
    public function images()
    {
        return $this->hasMany(CatalogPdf::class, 'image_group_id')->orderBy('display_order');
    }

    /**
     * Scope para grupos activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para grupos ordenados
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    /**
     * Obtener el conteo de imágenes en este grupo
     */
    public function getImagesCountAttribute()
    {
        return $this->images()->count();
    }

    /**
     * Obtener la primera imagen del grupo como imagen de portada
     */
    public function getCoverImageAttribute()
    {
        return $this->images()->first();
    }
}