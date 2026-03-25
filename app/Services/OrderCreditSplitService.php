<?php

namespace App\Services;

/**
 * Divide líneas del carrito entre cupo de crédito (Orden A) y el resto (Orden B / Mercado Pago).
 * Respeta cantidades enteras; puede partir una línea en dos órdenes.
 */
class OrderCreditSplitService
{
    /**
     * @param  array<int, array{product_id: string|int, name: string, price: float|int, quantity: int, size?: ?string, color?: ?string, barcode?: ?string}>  $items
     * @return array{credit_items: array, mp_items: array, credit_subtotal: float, mp_lines_subtotal: float, lines_sum: float}
     */
    public function splitItemsByCreditCap(array $items, float $maxCreditForLines): array
    {
        $maxCreditForLines = round(max(0, $maxCreditForLines), 2);
        $creditItems = [];
        $mpItems = [];
        $remaining = $maxCreditForLines;

        foreach ($items as $item) {
            $price = round((float) ($item['price'] ?? 0), 2);
            $qty = max(0, (int) ($item['quantity'] ?? 0));
            if ($qty <= 0 || $price < 0) {
                continue;
            }

            $lineTotal = round($price * $qty, 2);

            if ($remaining <= 0) {
                $mpItems[] = $item;
                continue;
            }

            if ($lineTotal <= $remaining + 0.0001) {
                $creditItems[] = $item;
                $remaining = round($remaining - $lineTotal, 2);
                continue;
            }

            $unitsForCredit = $price > 0 ? (int) floor($remaining / $price) : 0;
            if ($unitsForCredit > 0) {
                $creditItems[] = array_merge($item, ['quantity' => $unitsForCredit]);
                $rest = $qty - $unitsForCredit;
                if ($rest > 0) {
                    $mpItems[] = array_merge($item, ['quantity' => $rest]);
                }
                $remaining = round($remaining - ($unitsForCredit * $price), 2);
            } else {
                $mpItems[] = $item;
            }
        }

        $creditSubtotal = $this->sumLines($creditItems);
        $mpLinesSubtotal = $this->sumLines($mpItems);
        $linesSum = round($creditSubtotal + $mpLinesSubtotal, 2);

        return [
            'credit_items' => $creditItems,
            'mp_items' => $mpItems,
            'credit_subtotal' => $creditSubtotal,
            'mp_lines_subtotal' => $mpLinesSubtotal,
            'lines_sum' => $linesSum,
        ];
    }

    /**
     * @param  array<int, array{price: mixed, quantity: mixed}>  $lines
     */
    public function sumLines(array $lines): float
    {
        $sum = 0.0;
        foreach ($lines as $line) {
            $sum += (float) $line['price'] * (int) $line['quantity'];
        }

        return round($sum, 2);
    }

    /**
     * Reparte subtotal, discounted_total y descuentos del request en proporción al subtotal de líneas de cada pedido.
     *
     * @return array{subtotal: float, discounted_total: float, descuento1: float, descuento2: float}
     */
    public function prorateOrderAmounts(
        float $linesSubtotalThisOrder,
        float $cartLinesSum,
        float $requestSubtotal,
        float $requestDiscountedTotal,
        float $descuento1,
        float $descuento2
    ): array {
        if ($cartLinesSum <= 0) {
            return [
                'subtotal' => round($requestSubtotal, 2),
                'discounted_total' => round($requestDiscountedTotal, 2),
                'descuento1' => round($descuento1, 2),
                'descuento2' => round($descuento2, 2),
            ];
        }

        $ratio = $linesSubtotalThisOrder / $cartLinesSum;

        // discounted_total debe ser la parte del total NETO con descuentos (no el bruto de líneas)
        $discountedThis = round((float) $requestDiscountedTotal * $ratio, 2);

        return [
            'subtotal' => round($requestSubtotal * $ratio, 2),
            'discounted_total' => $discountedThis,
            'descuento1' => round((float) $descuento1 * $ratio, 2),
            'descuento2' => round((float) $descuento2 * $ratio, 2),
        ];
    }

    /**
     * Tope en subtotal bruto de líneas equivalente a un tope en mercancía neta (descuentos $7k/$15k a nivel carrito).
     */
    public function grossCapForNetCredit(float $linesGross, float $merchandiseNet, float $netCreditCap): float
    {
        $linesGross = round(max(0, $linesGross), 2);
        $merchandiseNet = round(max(0, $merchandiseNet), 2);
        $netCreditCap = round(max(0, $netCreditCap), 2);

        if ($linesGross <= 0 || $merchandiseNet <= 0.0001) {
            return 0.0;
        }

        $netCreditCap = min($netCreditCap, $merchandiseNet);

        return round($linesGross * ($netCreditCap / $merchandiseNet), 2);
    }
}
