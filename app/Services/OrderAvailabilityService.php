<?php

namespace App\Services;

use App\Models\Detalle;
use App\Models\Producto;
use App\Support\OrderItemDetalleResolver;
use Illuminate\Http\JsonResponse;

/**
 * Valida la disponibilidad real (contra BD) de las líneas de un pedido
 * antes de concretar la venta.
 *
 * Reglas:
 *  - Rebaja (desc_promo > 0) + sin disponibilidad → rechazar (nunca encargo).
 *  - Sin rebaja + sin disponibilidad + sin flag encargo → rechazar.
 *  - Sin rebaja + sin disponibilidad + flag encargo → permitir (encargo legítimo).
 */
class OrderAvailabilityService
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    public function validateAvailablePieces(array $items): ?JsonResponse
    {
        $problems = [];

        foreach ($items as $index => $item) {
            $productId = trim((string) ($item['product_id'] ?? ''));
            $quantity = (int) ($item['quantity'] ?? 0);
            $isEncargo = filter_var($item['is_out_of_stock_encargo'] ?? false, FILTER_VALIDATE_BOOLEAN)
                || filter_var($item['is_coming_soon'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $requestDescPromo = isset($item['desc_promo']) ? (float) $item['desc_promo'] : null;

            if ($productId === '') {
                continue;
            }

            $producto = $this->resolveProduct($productId);
            if (! $producto) {
                continue;
            }

            // Rebaja de catálogo: priorizar desc_promo del request; si no viene, el de BD.
            $descPromo = $requestDescPromo;
            if ($descPromo === null || $descPromo <= 0.00001) {
                $descPromo = (float) ($producto->desc_promo ?? 0);
            }
            $isRebaja = $descPromo > 0.00001;

            $available = $this->resolveVariantAvailability($producto, $item);

            if ($available >= $quantity) {
                continue;
            }

            $name = trim((string) ($item['name'] ?? $producto->descripcion ?? $producto->id ?? $productId));
            $size = trim((string) ($item['size'] ?? ''));
            $color = trim((string) ($item['color'] ?? ''));
            $variantLabel = trim(implode(' / ', array_filter([$color, $size])));

            if ($isRebaja) {
                $problems[] = sprintf(
                    'El producto "%s"%s en rebaja está agotado. Retíralo del pedido.',
                    $name,
                    $variantLabel !== '' ? " ({$variantLabel})" : ''
                );
            } elseif (! $isEncargo) {
                $problems[] = sprintf(
                    'El producto "%s"%s no tiene disponibilidad suficiente (disponible: %d, solicitado: %d).',
                    $name,
                    $variantLabel !== '' ? " ({$variantLabel})" : '',
                    (int) round($available),
                    $quantity
                );
            }
            // Sin rebaja + encargo: permitido.
        }

        if ($problems === []) {
            return null;
        }

        $list = implode("\n", array_map(fn ($p) => '• '.$p, $problems));

        return response()->json([
            'success' => false,
            'message' => 'No se pudo confirmar el pedido. Revisa la disponibilidad de los siguientes productos:',
            'availability_problems' => $problems,
            'availability_detail' => $list,
        ], 422);
    }

    private function resolveProduct(string $productId): ?Producto
    {
        $candidates = [
            $productId,
            str_pad($productId, 6, '0', STR_PAD_LEFT),
            '0'.$productId,
        ];
        if (strlen($productId) === 6) {
            $candidates[] = ltrim($productId, '0') ?: $productId;
        }

        foreach ($candidates as $candidate) {
            $p = Producto::query()->whereKey($candidate)->first(['id', 'desc_promo', 'inventario', 'descripcion']);
            if ($p) {
                return $p;
            }
        }

        return Producto::query()
            ->where('id', 'LIKE', '%'.$productId)
            ->first(['id', 'desc_promo', 'inventario', 'descripcion']);
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function resolveVariantAvailability(Producto $producto, array $item): float
    {
        $detalleId = $item['detalle_id'] ?? null;
        if ($detalleId !== null && is_numeric($detalleId)) {
            $detalle = Detalle::query()
                ->where('producto_id', $producto->id)
                ->whereKey((int) $detalleId)
                ->first(['inventario_d']);
            if ($detalle) {
                return Producto::effectiveDetailInventoryContribution($detalle->inventario_d);
            }
        }

        $detalleIdResolved = OrderItemDetalleResolver::resolve($item);
        if ($detalleIdResolved !== null) {
            $detalle = Detalle::query()
                ->where('producto_id', $producto->id)
                ->whereKey($detalleIdResolved)
                ->first(['inventario_d']);
            if ($detalle) {
                return Producto::effectiveDetailInventoryContribution($detalle->inventario_d);
            }
        }

        return (float) $producto->computeTotalInventoryQuantity();
    }
}