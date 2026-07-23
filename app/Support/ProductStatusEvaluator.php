<?php

namespace App\Support;

use App\Models\Producto;
use DateTime;

/**
 * Evaluador central de estado de un producto (Próximamente / Nuevo / Agotado / En Rebaja).
 *
 * Reglas:
 *
 *  STATUS (mutuamente excluyente):
 *   - new           → inventario > 0  AND fecha_compra dentro de últimos 30 días
 *   - in-stock      → inventario > 0  AND no es "new"
 *   - coming-soon   → inventario = 0  AND es recién llegado (nunca recibió stock y/o fue dado de alta reciente)
 *                     AND sin oferta desc_promo activa
 *   - out-of-stock  → inventario = 0  AND no es recién llegado (o tiene desc_promo activa)
 *
 *  FLAGS (independientes, combinables entre sí):
 *   - is_on_sale    → desc_promo > 0  ó  opc_promo === 'S'
 *
 *  "Recién llegado" se determina por:
 *   - stock_received_count === 0  (nunca ha sido recibido físicamente)
 *   - AND ( opc_nuevo === 'S'  OR  fecha_alta IS NULL  OR  fecha_alta dentro de últimos 90 días / futura )
 *
 *  NOTA: Antes se usaba una heurística por el tercer dígito del id (= último dígito del año). Fue removida
 *        porque marcaba como "próximamente" productos antiguos que se agotaban. Esta clase la sustituye y
 *        debe ser la única fuente de verdad (backend + frontend espejo).
 */
final class ProductStatusEvaluator
{
    public const STATUS_NEW = 'new';
    public const STATUS_IN_STOCK = 'in-stock';
    public const STATUS_COMING_SOON = 'coming-soon';
    public const STATUS_OUT_OF_STOCK = 'out-of-stock';

    /** Días hacia atrás para considerar "new" por fecha_compra. */
    public const NEW_WINDOW_DAYS = 30;

    /** Días hacia atrás desde fecha_alta para considerar al producto como recién llegado. */
    public const NEW_ARRIVAL_WINDOW_DAYS = 90;

    /**
     * Devuelve un array con `status` (uno de los 4) y los flags booleanos.
     *
     * @param  object|array<string,mixed>  $row       Fila del producto (Eloquent, stdClass o array)
     * @param  float                       $inventoryTotal  Stock total (suma de detalles o cabecera)
     * @param  array<int, object|array<string,mixed>>  $detalleRows  filas con inventario_d (opcional)
     * @return array{status:string, is_in_stock:bool, is_new:bool, is_coming_soon:bool, is_out_of_stock:bool, is_on_sale:bool}
     */
    public static function evaluate(object|array $row, float $inventoryTotal, array $detalleRows = []): array
    {
        $isOnSale = self::hasActiveSaleFromRow($row);

        // Caso 1: hay stock → in-stock / new
        if ($inventoryTotal > 0.00001) {
            $isNew = ProductNewEvaluator::isNewLikeNuevosPage(
                self::readField($row, 'fecha_compra'),
                $inventoryTotal,
                $detalleRows
            );

            return [
                'status' => $isNew ? self::STATUS_NEW : self::STATUS_IN_STOCK,
                'is_in_stock' => true,
                'is_new' => $isNew,
                'is_coming_soon' => false,
                'is_out_of_stock' => false,
                'is_on_sale' => $isOnSale,
            ];
        }

        // Caso 2: sin stock → out-of-stock / coming-soon
        // Si tiene oferta activa, no es recién llegado: es un producto conocido agotado.
        if ($isOnSale) {
            return [
                'status' => self::STATUS_OUT_OF_STOCK,
                'is_in_stock' => false,
                'is_new' => false,
                'is_coming_soon' => false,
                'is_out_of_stock' => true,
                'is_on_sale' => true,
            ];
        }

        $isComingSoon = self::isNewArrivalFromRow($row);

        return [
            'status' => $isComingSoon ? self::STATUS_COMING_SOON : self::STATUS_OUT_OF_STOCK,
            'is_in_stock' => false,
            'is_new' => false,
            'is_coming_soon' => $isComingSoon,
            'is_out_of_stock' => ! $isComingSoon,
            'is_on_sale' => $isOnSale,
        ];
    }

    /**
     * Devuelve sólo el string de status (atajo).
     */
    public static function status(object|array $row, float $inventoryTotal, array $detalleRows = []): string
    {
        return self::evaluate($row, $inventoryTotal, $detalleRows)['status'];
    }

    /**
     * Filtra una colección/array de productos por el estado deseado.
     *
     * @param  iterable<object|array<string,mixed>>  $products
     * @param  string  $filter  Uno de: 'all', 'in-stock', 'available', 'new', 'coming-soon', 'out-of-stock', 'on-sale'
     * @param  callable|null  $inventoryResolver  function($row): float  (si la fila no incluye inventario precalculado)
     * @return array<int, object|array<string,mixed>>
     */
    public static function filter(iterable $products, string $filter, ?callable $inventoryResolver = null): array
    {
        $out = [];
        foreach ($products as $row) {
            $inv = self::resolveInventoryTotal($row, $inventoryResolver);
            $eval = self::evaluate($row, $inv);
            if (self::matchesFilter($eval, $filter)) {
                $out[] = $row;
            }
        }
        return $out;
    }

    /**
     * ¿El producto (evaluado) pasa el filtro solicitado?
     */
    public static function matchesFilter(array $evaluation, string $filter): bool
    {
        return match ($filter) {
            'all' => true,
            'in-stock' => $evaluation['status'] === self::STATUS_IN_STOCK,
            'available' => in_array($evaluation['status'], [self::STATUS_IN_STOCK, self::STATUS_NEW], true),
            'new' => $evaluation['is_new'] === true,
            'coming-soon' => $evaluation['is_coming_soon'] === true,
            'out-of-stock' => $evaluation['is_out_of_stock'] === true,
            'on-sale' => $evaluation['is_on_sale'] === true,
            default => true,
        };
    }

    /**
     * ¿El producto tiene una oferta/descuento activa (desc_promo > 0 o opc_promo='S')?
     */
    public static function hasActiveSaleFromRow(object|array $row): bool
    {
        $desc = (float) self::readField($row, 'desc_promo');
        if ($desc > 0.00001) {
            return true;
        }
        $opc = strtoupper((string) self::readField($row, 'opc_promo', 'N'));

        return $opc === 'S';
    }

    /**
     * Determina si el producto es un recién llegado (candidato a "próximamente"):
     *  - Nunca ha recibido stock (stock_received_count = 0)
     *  - Y ( marca explícita de nuevo  OR  sin fecha_alta  OR  fecha_alta reciente (≤90d) / futura )
     */
    public static function isNewArrivalFromRow(object|array $row): bool
    {
        $stockReceived = (int) self::readField($row, 'stock_received_count');
        if ($stockReceived > 0) {
            return false;
        }

        $opcNuevo = strtoupper((string) self::readField($row, 'opc_nuevo', 'N'));
        if ($opcNuevo === 'S') {
            return true;
        }

        $fechaAlta = self::readField($row, 'fecha_alta');
        if ($fechaAlta === null || $fechaAlta === '') {
            return true;
        }

        $ts = self::parseDateToTs($fechaAlta);
        if ($ts === null) {
            return false;
        }

        $diffDays = (int) floor((time() - $ts) / 86400);

        // Reciente (≤ 90 días) o futura (diffDays negativo).
        return $diffDays <= self::NEW_ARRIVAL_WINDOW_DAYS;
    }

    /**
     * Lee un campo de una fila (object/array) tolerando atributos Eloquent.
     */
    private static function readField(object|array $row, string $key, mixed $default = null): mixed
    {
        if (is_array($row)) {
            return array_key_exists($key, $row) ? $row[$key] : $default;
        }

        // Eloquent model: preferir atributo "limpio"
        if (method_exists($row, 'getAttribute')) {
            $val = $row->getAttribute($key);
            if ($val !== null) {
                return $val;
            }
        }

        return $row->{$key} ?? $default;
    }

    /**
     * Parsea una fecha en cualquier formato aceptado (string / DateTimeInterface) a timestamp unix.
     */
    private static function parseDateToTs(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->getTimestamp();
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }
        foreach (['Y-m-d', 'd-m-Y', 'd/m/Y', 'Y/m/d'] as $fmt) {
            $dt = DateTime::createFromFormat($fmt, $s);
            if ($dt instanceof DateTime) {
                return $dt->getTimestamp();
            }
        }
        $ts = strtotime($s);

        return $ts === false ? null : $ts;
    }

    /**
     * Resuelve el inventario total desde la fila o un resolver externo.
     */
    private static function resolveInventoryTotal(object|array $row, ?callable $resolver): float
    {
        if ($resolver !== null) {
            return (float) $resolver($row);
        }

        // Si la fila trae ya "inventario_total" precalculado, úsalo.
        $pre = self::readField($row, 'inventario_total');
        if ($pre !== null) {
            return (float) $pre;
        }

        // Si trae detalles como array u objetos con inventario_d, sumar (positivos).
        $detalles = self::readField($row, 'detalles');
        if (is_iterable($detalles)) {
            $sum = 0.0;
            foreach ($detalles as $d) {
                $inv = is_array($d) ? ($d['inventario_d'] ?? null) : ($d->inventario_d ?? null);
                $v = (float) ($inv ?? 0);
                if ($v > 0.0000001) {
                    $sum += $v;
                }
            }
            if ($sum > 0.00001) {
                return $sum;
            }
        }

        // Fallback: cabecera inventario o piezas.
        $headerInv = self::readField($row, 'inventario');
        if ($headerInv === null || $headerInv === '') {
            $headerInv = self::readField($row, 'piezas', 0);
        }

        $n = (float) $headerInv;

        return $n > 0.0000001 ? $n : 0.0;
    }
}
