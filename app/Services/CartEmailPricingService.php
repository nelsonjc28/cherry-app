<?php

namespace App\Services;

use App\Models\Detalle;

/**
 * Vista previa de precios del carrito para correos (alineado a reglas $7k / $15k del checkout).
 */
class CartEmailPricingService
{
    /**
     * URL imagen principal en bucket cherry-fotos (misma convención que el frontend).
     */
    public static function s3ProductImageUrl(?string $externalProductId): string
    {
        if ($externalProductId === null || $externalProductId === '') {
            return '';
        }

        return 'https://cherry-fotos.s3.amazonaws.com/shopify/'.$externalProductId.'/'.$externalProductId.'_1.jpg';
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{lines: list<array<string, mixed>>, regular_subtotal: float, eligible_for_volume: float, volume_discount_20: float, volume_discount_10: float, volume_discount_total: float, estimated_net_merchandise: float}
     */
    public static function buildPreview(array $items, string $sellerCategory = 'bronce'): array
    {
        $lines = [];
        $regularTotal = 0.0;
        $eligibleTotal = 0.0;

        foreach ($items as $item) {
            $qty = (int) ($item['quantity'] ?? 0);
            if ($qty < 1) {
                continue;
            }

            $price = (float) ($item['precio'] ?? $item['price'] ?? 0);
            $pid = (string) ($item['id_articulo'] ?? $item['product_id'] ?? $item['id'] ?? '');

            $lineTotal = $price * $qty;
            if (! empty($item['userOffer']['discount_category']) && $item['userOffer']['discount_category'] === 'buy_x_get_y') {
                $free = (int) ($item['freeItemsCount'] ?? 0);
                $paid = isset($item['_paidQuantity']) ? (int) $item['_paidQuantity'] : max(0, $qty - $free);
                $lineTotal = $price * $paid;
            }

            $regularTotal += $lineTotal;

            $descPromo = $item['desc_promo'] ?? null;
            $hasNoPromo = ($descPromo === 0 || $descPromo === null || $descPromo === '0');
            $uc = $item['userOffer']['discount_category'] ?? null;
            $hasNoUserOffer = empty($item['userOffer']) || $uc === null || $uc === '';
            if ($hasNoPromo && $hasNoUserOffer) {
                $eligibleTotal += $lineTotal;
            }

            $size = $item['selectedSize'] ?? $item['size'] ?? null;
            $color = $item['selectedColor'] ?? $item['color'] ?? null;
            $detalleId = $item['detalle_id'] ?? null;
            if ($detalleId && (is_numeric($detalleId))) {
                $d = Detalle::find((int) $detalleId);
                if ($d) {
                    $size = $size ?: $d->detalle;
                    $color = $color ?: $d->nombreColor;
                }
            }

            $lines[] = [
                'name' => $item['title'] ?? $item['name'] ?? 'Producto',
                'product_id' => $pid,
                'color' => $color,
                'size' => $size,
                'quantity' => $qty,
                'unit_price' => round($price, 2),
                'line_gross' => round($lineTotal, 2),
                'image_url' => self::s3ProductImageUrl($pid),
            ];
        }

        $isDiamante = $sellerCategory === 'diamante';
        $mainRate = $isDiamante ? 0.33 : 0.20;

        $vol20 = 0.0;
        $vol10 = 0.0;
        if ($eligibleTotal >= 7000) {
            $vol20 = $eligibleTotal * $mainRate;
            if ($eligibleTotal >= 15000) {
                $after = $eligibleTotal - $vol20;
                $vol10 = $after * 0.10;
            }
        }

        $volumeDiscount = round($vol20 + $vol10, 2);
        $estimatedNet = round(max(0, $regularTotal - $volumeDiscount), 2);

        return [
            'lines' => $lines,
            'regular_subtotal' => round($regularTotal, 2),
            'eligible_for_volume' => round($eligibleTotal, 2),
            'volume_discount_20' => round($vol20, 2),
            'volume_discount_10' => round($vol10, 2),
            'volume_discount_total' => $volumeDiscount,
            'estimated_net_merchandise' => $estimatedNet,
        ];
    }
}
