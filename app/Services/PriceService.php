<?php

namespace App\Services;

use App\Models\User;

/**
 * Precios y descuentos por volumen.
 *
 * descuento1 / descuento2 desde la API de clientes (consulta por cálculo).
 *
 * Si la API devuelve descuento1 usable: ese % y las reglas habituales de quién aplica (no-bronce con
 * elegible > 0; bronce con ≥ $7.000 o beneficio temporal).
 *
 * Si la API no devuelve descuento1: se aplica a **todos** el mismo criterio que antes era solo bronce
 * (≥ $7.000 elegible o ventana de 45 días con bronze_benefit_active) y porcentajes 30 % + 10 % segundo tramo.
 */
class PriceService
{
    public const BRONCE_MAIN_ELIGIBLE_MIN = 7000.0;

    public const SECOND_TIER_ELIGIBLE_MIN = 15000.0;

    public function __construct(
        protected ExternalClienteDiscountService $externalClienteDiscountService
    ) {}

    /**
     * Una sola llamada HTTP a la API de clientes por invocación.
     *
     * @return array{d1: ?float, d2: ?float}
     */
    private function fetchVolumePercentsFromExternalApi(User $user): array
    {
        $r = $this->externalClienteDiscountService->fetchDiscountPercents((int) $user->id);
        if (! $r['success']) {
            return ['d1' => null, 'd2' => null];
        }

        return [
            'd1' => $r['descuento1'],
            'd2' => $r['descuento2'],
        ];
    }

    private function apiProvidedMainPercent(?float $d1): bool
    {
        return $d1 !== null && (float) $d1 > 0.00001;
    }

    /**
     * Ventana de beneficio temporal (45 días): flags en usuario, sin filtrar por categoría.
     * Usada cuando la API no define descuento1: todos quedan sujetos al mismo umbral que bronce.
     */
    public function isVolumeBenefitWindowActive(User $user): bool
    {
        if (! (bool) ($user->bronze_benefit_active ?? false)) {
            return false;
        }

        $expiresAt = $user->benefit_expires_at;
        if (! $expiresAt) {
            return false;
        }

        return now()->lt($expiresAt);
    }

    public function isBronzeBenefitActive(User $user): bool
    {
        $cat = strtolower((string) ($user->seller_category ?? 'bronce'));
        if ($cat !== 'bronce') {
            return false;
        }

        return $this->isVolumeBenefitWindowActive($user);
    }

    /**
     * Cuando la API no trae descuento1: mismas reglas de elegibilidad que bronce para cualquier usuario.
     */
    public function shouldApplyMainDiscountWhenNoApiMain(User $user, float $eligibleTotal): bool
    {
        if ($eligibleTotal <= 0) {
            return false;
        }

        return $this->isVolumeBenefitWindowActive($user)
            || $eligibleTotal >= self::BRONCE_MAIN_ELIGIBLE_MIN;
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
        $p = $this->fetchVolumePercentsFromExternalApi($user);

        return $this->volumeMainTierFromApiPercent($p['d1']);
    }

    /**
     * Sin descuento1 en API: 30 % (regla “modo bronce” para todos).
     *
     * @return array{rate: float, percent: int}
     */
    private function volumeMainTierFromApiPercent(?float $apiPct): array
    {
        if ($apiPct !== null && (float) $apiPct > 0.00001) {
            $p = (float) $apiPct;

            return ['rate' => round($p / 100.0, 4), 'percent' => (int) round($p)];
        }

        return ['rate' => 0.30, 'percent' => 30];
    }

    /**
     * Segundo tramo: API si viene descuento2 (≥ 0); si no, 10 % (misma regla que modo bronce).
     */
    public function volumeExtraPercent(User $user): float
    {
        $p = $this->fetchVolumePercentsFromExternalApi($user);

        return $this->volumeExtraPercentFromApiPercent($p['d2']);
    }

    private function volumeExtraPercentFromApiPercent(?float $p): float
    {
        if ($p !== null && (float) $p >= 0) {
            return (float) $p;
        }

        return 10.0;
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

        $percents = $this->fetchVolumePercentsFromExternalApi($user);
        $hasApiMain = $this->apiProvidedMainPercent($percents['d1']);
        $tier = $this->volumeMainTierFromApiPercent($percents['d1']);
        $mainRate = $tier['rate'];
        $mainPercent = (float) $tier['percent'];
        $extraPercent = $this->volumeExtraPercentFromApiPercent($percents['d2']);
        $extraRate = round($extraPercent / 100.0, 4);

        $volMain = 0.0;
        $volExtra = 0.0;
        $descuento1 = 0.0;
        $descuento2 = 0.0;

        $appliesMain = $hasApiMain
            ? $this->shouldApplyMainDiscount($user, $eligibleTotal)
            : $this->shouldApplyMainDiscountWhenNoApiMain($user, $eligibleTotal);

        if ($appliesMain) {
            $descuento1 = $mainPercent;
            $volMain = round($eligibleTotal * $mainRate, 2);
            $afterMain = round($eligibleTotal - $volMain, 2);

            if ($eligibleTotal >= self::SECOND_TIER_ELIGIBLE_MIN) {
                $volExtra = round($afterMain * $extraRate, 2);
                $descuento2 = $extraPercent;
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
