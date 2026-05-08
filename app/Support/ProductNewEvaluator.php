<?php

namespace App\Support;

use App\Models\Producto;
use DateTime;

/**
 * Misma regla que la página /nuevos: fecha_compra ≤ 30 días y stock > 0.
 */
class ProductNewEvaluator
{
    public static function formatFechaCompraForApi($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        $s = trim((string) $value);
        foreach (['Y-m-d', 'd-m-Y', 'd/m/Y', 'Y/m/d'] as $fmt) {
            $dt = DateTime::createFromFormat($fmt, $s);
            if ($dt instanceof DateTime) {
                return $dt->format('Y-m-d');
            }
        }
        $ts = strtotime($s);

        return $ts ? date('Y-m-d', $ts) : null;
    }

    /**
     * @param  array<int, array<string, mixed>|object>  $detalleRows  filas con inventario_d si existen
     */
    public static function isNewLikeNuevosPage(?string $fechaCompraRaw, float $headerInventory, array $detalleRows = []): bool
    {
        $norm = self::formatFechaCompraForApi($fechaCompraRaw);
        if (! $norm) {
            return false;
        }
        $ts = strtotime($norm);
        if (! $ts || $ts <= strtotime('-30 days')) {
            return false;
        }
        $sumDet = 0.0;
        foreach ($detalleRows as $d) {
            $inv = is_array($d) ? ($d['inventario_d'] ?? null) : ($d->inventario_d ?? null);
            $sumDet += Producto::effectiveDetailInventoryContribution($inv);
        }
        $total = $sumDet > 0.00001 ? $sumDet : Producto::effectiveDetailInventoryContribution($headerInventory);

        return $total > 0.00001;
    }
}
