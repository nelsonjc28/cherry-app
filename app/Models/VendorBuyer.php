<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo pivot entre usuarios vendedores y compradores.
 * Aunque es una tabla pivote, se modela como Model para permitir:
 *   - CRUD directo desde endpoints admin.
 *   - Filtros dinámicos (ej: sólo compradores oro/diamante activos).
 *   - Campos extra: is_active, timestamps.
 *
 * @property int $id
 * @property int $vendor_id
 * @property int $buyer_id
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User $vendor
 * @property-read User $buyer
 */
class VendorBuyer extends Model
{
    use HasFactory;

    protected $table = 'vendor_buyer';

    protected $fillable = [
        'vendor_id',
        'buyer_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Categorías de vendedor permitidas como comprador asociado.
     * Cualquier valor fuera de esta lista NO puede ser vinculado a un vendedor.
     */
    public const ALLOWED_BUYER_CATEGORIES = ['oro', 'diamante'];

    /**
     * Vendedor asociado.
     */
    public function vendor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    /**
     * Comprador asociado.
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Scope: sólo asociaciones activas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Verifica si el usuario dado puede ser comprador de un vendedor
     * (debe tener seller_category oro o diamante).
     */
    public static function isEligibleBuyer(User $user): bool
    {
        return in_array($user->seller_category, self::ALLOWED_BUYER_CATEGORIES, true);
    }
}