<?php

namespace App\Services;

use App\Models\User;

/**
 * Precios y descuentos por volumen según categoría de vendedor.
 *
 * BRONCE: 30 % solo si subtotal elegible ≥ $7,000; si elegible ≥ $15,000, +10 % sobre el monto tras el primer descuento.
 * ORO: 30 % desde pieza 1 (elegible > 0); mismo +10 % si elegible ≥ $15,000.
 * DIAMANTE: 33 % desde pieza 1; mismo +10 % si elegible ≥ $15,000.
 */
class PriceService
{
    public const BRONCE_MAIN_ELIGIBLE_MIN = 7000.0;

    public const SECOND_TIER_ELIGIBLE_MIN = 15000.0;

    public function isBronzeBenefitActive(User $user): bool
    {
        $cat = strtolower((string) ($user->seller_category ?? 'bronce'));
        if ($cat !== 'bronce') {
            return false;
        }

        if (! (bool) ($user->bronze_benefit_active ?? false)) {
            return false;
        }

        $expiresAt = $user->benefit_expires_at;
        if (! $expiresAt) {
            return false;
        }

        return now()->lt($expiresAt);
    }

    public function shouldApplyMainDiscount(User $user, float $eligibleTotal): bool
    {
        if ($eligibleTotal <= 0) {
            return false;
        }

        $cat = strtolower((string) ($user->seller_category ?? 'bronce'));
        if ($cat !== 'bronce') {
            return true;
        }

        return $this->isBronzeBenefitActive($user)
            || $eligibleTotal >= self::BRONCE_MAIN_ELIGIBLE_MIN;
    }

    /**
     * @return array{rate: float, percent: int}
     */
    public function volumeMainTier(User $user): array
    {
        $cat = strtolower((string) ($user->seller_category ?? 'bronce'));

        if ($cat === 'diamante') {
            return ['rate' => 0.33, 'percent' => 33];
        }

        return ['rate' => 0.30, 'percent' => 30];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items  price, quantity, desc_promo?, user_offer_applies?
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
        $linesSum = 0.0;
        foreach ($items as $item) {
            $linesSum += round((float) ($item['price'] ?? 0) * (int) ($item['quantity'] ?? 0), 2);
        }
        $linesSum = round($linesSum, 2);

        $eligibleTotal = 0.0;
        foreach ($items as $item) {
            $descPromo = $item['desc_promo'] ?? null;
            $hasPromo = $descPromo !== null && (float) $descPromo > 0.0001;
            $hasUserOffer = filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if ($hasPromo || $hasUserOffer) {
                continue;
            }
            $eligibleTotal += round((float) ($item['price'] ?? 0) * (int) ($item['quantity'] ?? 0), 2);
        }
        $eligibleTotal = round($eligibleTotal, 2);

        $tier = $this->volumeMainTier($user);
        $mainRate = $tier['rate'];
        $mainPercent = (float) $tier['percent'];
        $cat = strtolower((string) ($user->seller_category ?? 'bronce'));

        $volMain = 0.0;
        $volExtra = 0.0;
        $descuento1 = 0.0;
        $descuento2 = 0.0;

        $appliesMain = $this->shouldApplyMainDiscount($user, $eligibleTotal);

        if ($appliesMain) {
            $descuento1 = $mainPercent;
            $volMain = round($eligibleTotal * $mainRate, 2);
            $afterMain = round($eligibleTotal - $volMain, 2);

            if ($eligibleTotal >= self::SECOND_TIER_ELIGIBLE_MIN) {
                $volExtra = round($afterMain * 0.10, 2);
                $descuento2 = 10.0;
            }
        }

        $volumeDiscount = round($volMain + $volExtra, 2);
        $discountedMerchandise = round(max(0.0, $linesSum - $volumeDiscount), 2);

        return [
            'lines_sum' => $linesSum,
            'eligible_total' => $eligibleTotal,
            'volume_discount' => $volumeDiscount,
            'descuento1' => $descuento1,
            'descuento2' => $descuento2,
            'discounted_merchandise' => $discountedMerchandise,
        ];
    }
}
