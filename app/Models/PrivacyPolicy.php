<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PrivacyPolicy extends Model
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
     * Obtener la política de privacidad activa
     */
    public static function getActivePolicy()
    {
        return static::where('is_active', true)->latest()->first();
    }

    /**
     * Obtener la política de privacidad por versión
     */
    public static function getPolicyByVersion($version)
    {
        return static::where('version', $version)->first();
    }

    /**
     * Publicar la política
     */
    public function publish()
    {
        $this->update([
            'is_active' => true,
            'published_at' => now()
        ]);
    }

    /**
     * Desactivar la política
     */
    public function unpublish()
    {
        $this->update([
            'is_active' => false
        ]);
    }
}
