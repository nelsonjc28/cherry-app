<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WelcomeSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'title_color',
        'subtitle',
        'button_text',
        'button_url',
        'image_path',
        'is_active',
        'display_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'display_order' => 'integer'
    ];

    /**
     * Scope para obtener secciones activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para ordenar por orden de visualización
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order', 'asc');
    }

    /**
     * Obtener la sección activa principal
     */
    public static function getActiveSection()
    {
        return self::active()
            ->ordered()
            ->first();
    }

    /**
     * Obtener todas las secciones activas
     */
    public static function getActiveSections()
    {
        return self::active()
            ->ordered()
            ->get();
    }
} 