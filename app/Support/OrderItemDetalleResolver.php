<?php

namespace App\Support;

use App\Models\Detalle;

/**
 * Resuelve el id del registro en `detalles` (variante talla/color) para una línea de pedido/carrito.
 */
class OrderItemDetalleResolver
{
    public static function resolve(array $item): ?int
    {
        $raw = $item['detalle_id'] ?? $item['id_artd'] ?? null;
        if ($raw !== null && $raw !== '' && is_numeric($raw)) {
            $id = (int) $raw;
            if (Detalle::where('id', $id)->exists()) {
                return $id;
            }
        }

        $productId = trim((string) ($item['product_id'] ?? ''));
        $size = $item['size'] ?? $item['selectedSize'] ?? null;
        if ($productId === '' || $size === null || $size === '') {
            return null;
        }

        $color = $item['color'] ?? $item['selectedColor'] ?? null;

        $q = Detalle::query()->where('producto_id', $productId)->where('detalle', $size);
        if ($color !== null && $color !== '') {
            $q->where('nombreColor', $color);
        }

        $d = $q->first();

        return $d ? (int) $d->id : null;
    }
}
