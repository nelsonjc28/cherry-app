<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrderedCatalog extends Model
{
    use HasFactory;

    protected $fillable = [
        'catalog_id',
        'display_order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Relación con el catálogo
     */
    public function catalog()
    {
        return $this->belongsTo(Catalog::class);
    }

    /**
     * Scope para catálogos activos
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
     * Obtener todos los catálogos ordenados con sus datos
     */
    public static function getOrderedCatalogs()
    {
        $orderedCatalogs = self::with('catalog')
            ->active()
            ->ordered()
            ->get();

        $catalogs = [];
        foreach ($orderedCatalogs as $orderedCatalog) {
            if ($orderedCatalog->catalog && $orderedCatalog->catalog->is_active) {
                $catalogs[] = $orderedCatalog->catalog;
            }
        }

        return collect($catalogs);
    }
}

