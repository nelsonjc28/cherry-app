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
