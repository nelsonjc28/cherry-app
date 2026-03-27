<?php

namespace App\Services;

use App\Models\User;

/**
 * Fachada sobre {@see PriceService} para inyección en controladores existentes.
 */
class OrderPricingService
{
    public function __construct(
        protected PriceService $priceService
    ) {}

    /**
     * @return array{rate: float, percent: int}
     */
    public function volumeMainTier(User $user): array
    {
        return $this->priceService->volumeMainTier($user);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items  Líneas con price, quantity, desc_promo?, user_offer_applies?
     * @return array{
     *   lines_sum: float,
     *   eligible_total: float,
     *   volume_discount: float,
     *   descuento1: float,
     *   descuento2: float,
     *   discounted_merchandise: float
     * }
     */
    public function summarizeVolumeFromItems(User $user, array $items): array
    {
        return $this->priceService->summarizeVolumeFromItems($user, $items);
    }

    /**
     * Mercancía neta para un subconjunto de líneas cuando el descuento por volumen se calculó sobre el carrito completo.
     * Reparte el volumen proporcionalmente al elegible del subconjunto (mismo criterio que el frontend).
     *
     * @param  array<int, array<string, mixed>>  $fullCartLines
     * @param  array<int, array<string, mixed>>  $subsetLines
     */
    public function discountedMerchandiseForSubset(User $user, array $fullCartLines, array $subsetLines): float
    {
        $full = $this->summarizeVolumeFromItems($user, $fullCartLines);

        $subsetLinesSum = 0.0;
        $subsetEligible = 0.0;

        foreach ($subsetLines as $item) {
            $line = round((float) ($item['price'] ?? 0) * (int) ($item['quantity'] ?? 0), 2);
            $subsetLinesSum += $line;

            $descPromo = $item['desc_promo'] ?? null;
            $hasPromo = $descPromo !== null && (float) $descPromo > 0.0001;
            $hasUserOffer = filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN);

            if (! $hasPromo && ! $hasUserOffer) {
                $subsetEligible += $line;
            }
        }

        $subsetLinesSum = round($subsetLinesSum, 2);
        $subsetEligible = round($subsetEligible, 2);

        $eligibleTotal = $full['eligible_total'];
        if ($eligibleTotal <= 0.0001) {
            return round(max(0.0, $subsetLinesSum), 2);
        }

        $ratio = $subsetEligible / $eligibleTotal;
        $subsetVolumeDiscount = round($full['volume_discount'] * $ratio, 2);

        return round(max(0.0, $subsetLinesSum - $subsetVolumeDiscount), 2);
    }

    /**
     * Comprueba coherencia entre totales enviados y recomputados (tolerancia).
     */
    public function totalsMatchRequest(
        float $expectedMerchandiseNet,
        float $requestDiscountedTotal,
        float $requestTotalAmount,
        float $shippingAmount,
        float $tolerance = 2.0
    ): bool {
        if (abs($expectedMerchandiseNet - (float) $requestDiscountedTotal) > $tolerance) {
            return false;
        }

        return abs((float) $requestTotalAmount - round($expectedMerchandiseNet + $shippingAmount, 2)) <= $tolerance;
    }
}
