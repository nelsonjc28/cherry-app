<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Suscripciones para avisar por correo cuando un producto pasa de sin existencias a con stock.
 * Se crean desde "próximamente" o al agregar a favoritos un producto agotado.
 */
class ProductNotification extends Model
{
    protected $fillable = [
        'user_id',
        'producto_id',
        'is_notified',
    ];

    protected function casts(): array
    {
        return [
            'is_notified' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id', 'id');
    }

    /**
     * Favorito en producto sin inventario: registrar aviso (o reabrir si ya se notificó antes).
     */
    public static function subscribeWhenFavoriteAdded(int $userId, string $productoId): void
    {
        $producto = Producto::query()->find($productoId);
        if (! $producto) {
            return;
        }

        if ((float) $producto->inventario > 0) {
            return;
        }

        $existing = self::query()
            ->where('user_id', $userId)
            ->where('producto_id', $productoId)
            ->first();

        if ($existing) {
            if ($existing->is_notified) {
                $existing->update(['is_notified' => false]);
            }

            return;
        }

        self::query()->create([
            'user_id' => $userId,
            'producto_id' => $productoId,
            'is_notified' => false,
        ]);
    }

    /**
     * Quitar favorito: cancelar aviso de stock para ese producto (misma fila user+producto).
     */
    public static function unsubscribeWhenFavoriteRemoved(int $userId, string $productoId): void
    {
        self::query()
            ->where('user_id', $userId)
            ->where('producto_id', $productoId)
            ->delete();
    }

    /**
     * El producto volvió a quedar sin stock: permitir un nuevo correo en la siguiente entrada de inventario.
     *
     * @param  list<string>  $productoIds
     */
    public static function resetNotifiedForProducts(array $productoIds): void
    {
        if ($productoIds === []) {
            return;
        }

        self::query()
            ->whereIn('producto_id', $productoIds)
            ->update(['is_notified' => false]);
    }
}
