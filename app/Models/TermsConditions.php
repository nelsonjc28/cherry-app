<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TermsConditions extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'is_active',
        'version',
        'published_at'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'published_at' => 'datetime'
    ];

    /**
     * Obtener los términos y condiciones activos
     */
    public static function getActiveTerms()
    {
        return static::where('is_active', true)->latest()->first();
    }

    /**
     * Obtener términos por versión
     */
    public static function getTermsByVersion($version)
    {
        return static::where('version', $version)->first();
    }

    /**
     * Publicar los términos
     */
    public function publish()
    {
        $this->update([
            'is_active' => true,
            'published_at' => now()
        ]);
    }

    /**
     * Desactivar los términos
     */
    public function unpublish()
    {
        $this->update([
            'is_active' => false
        ]);
    }
}
