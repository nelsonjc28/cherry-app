<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTermsAcceptance extends Model
{
    use HasFactory;

    protected $table = 'user_terms_acceptance';

    protected $fillable = [
        'user_id',
        'terms_version',
        'terms_accepted',
        'terms_accepted_at',
        'ip_address',
        'user_agent'
    ];

    protected $casts = [
        'terms_accepted' => 'boolean',
        'terms_accepted_at' => 'datetime'
    ];

    /**
     * Relación con el usuario
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Verificar si el usuario ha aceptado una versión específica de términos
     */
    public static function hasAcceptedVersion($userId, $version)
    {
        return static::where('user_id', $userId)
            ->where('terms_version', $version)
            ->where('terms_accepted', true)
            ->exists();
    }

    /**
     * Obtener la última aceptación de términos del usuario
     */
    public static function getLatestAcceptance($userId)
    {
        return static::where('user_id', $userId)
            ->where('terms_accepted', true)
            ->latest('terms_accepted_at')
            ->first();
    }

    /**
     * Registrar aceptación de términos
     */
    public static function recordAcceptance($userId, $version, $ipAddress = null, $userAgent = null)
    {
        return static::updateOrCreate(
            [
                'user_id' => $userId,
                'terms_version' => $version
            ],
            [
                'terms_accepted' => true,
                'terms_accepted_at' => now(),
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent
            ]
        );
    }
}
