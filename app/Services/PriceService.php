<?php

namespace App\Services;

use App\Models\User;

/**
 * Precios y descuentos por volumen.
 *
 * descuento1 / descuento2 desde la API de clientes (consulta por cálculo).
 *
 * Reglas por categoría (acuerdo de negocio):
 *
 * - Bronce: descuento por PIEZAS (no por monto).
 *     * Primera compra: requiere 12 piezas sin `desc_promo` y sin oferta de usuario
 *       para obtener 30 % + 10 % adicional.
 *     * Compras posteriores: requiere 6 piezas sin `desc_promo` y sin oferta de usuario
 *       para obtener 30 %.
 *     * Si no alcanza el umbral: 0 % y el cliente debe retirar en tienda
 *       (el frontend bloquea la opción de envío a domicilio en este caso).
 *     * El backend NO consulta la API de descuentos del cliente para bronce.
 *
 * - Oro / Diamante: descuento por monto elegible (reglas previas).
 *     * Si la API devuelve `descuento1` usable (> 0): se usa ese % y `descuento2` se aplica
 *       junto al primero, sin requerir elegible ≥ 15.000.
 *     * Si la API no devuelve `descuento1`: elegible ≥ $7.000 o ventana 45 días con
 *       `bronze_benefit_active` y porcentajes 30 % + 10 % solo si elegible ≥ $15.000.
 */
class PriceService
{
    public const BRONZE_PIECES_FIRST_PURCHASE = 12;

    public const BRONZE_PIECES_AFTER_FIRST = 6;

    public const BRONZE_FIRST_TIER_PERCENT = 30;

    public const BRONZE_SECOND_TIER_PERCENT = 10;

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
     * Categoría normalizada del usuario.
     */
    public function getSellerCategory(User $user): string
    {
        return strtolower((string) ($user->seller_category ?? 'bronce'));
    }

    public function isBronze(User $user): bool
    {
        return $this->getSellerCategory($user) === 'bronce';
    }

    public function isPremium(User $user): bool
    {
        $cat = $this->getSellerCategory($user);
        return $cat === 'oro' || $cat === 'diamante';
    }

    /**
     * Indica si el usuario bronce ya completó su primera compra exitosa.
     */
    public function hasCompletedFirstPurchase(User $user): bool
    {
        return $user->first_purchase_completed_at !== null;
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
        if (! $this->isBronze($user)) {
            return false;
        }

        return $this->isVolumeBenefitWindowActive($user);
    }

    /**
     * Cuenta piezas sin `desc_promo` y sin oferta de usuario, usadas para
     * los umbrales de bronce (12 primera compra / 6 posteriores).
     */
    public function countEligiblePieces(array $items): int
    {
        $pieces = 0;
        foreach ($items as $item) {
            $descPromo = $item['desc_promo'] ?? null;
            $hasPromo = $descPromo !== null && (float) $descPromo > 0.0001;
            $hasUserOffer = filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN);
            if ($hasPromo || $hasUserOffer) {
                continue;
            }
            $pieces += (int) ($item['quantity'] ?? 0);
        }

        return $pieces;
    }

    /**
     * Bronce: piezas mínimas para que el cliente tenga opción de envío a domicilio.
     * - Primera compra: 12 piezas sin rebaja.
     * - Compras posteriores: 6 piezas sin rebaja.
     */
    public function bronzeShippingPiecesThreshold(User $user): int
    {
        return $this->hasCompletedFirstPurchase($user)
            ? self::BRONZE_PIECES_AFTER_FIRST
            : self::BRONZE_PIECES_FIRST_PURCHASE;
    }

    /**
     * Bronce: piezas mínimas para que aplique el 30 % de descuento.
     * - Primera compra: 12 piezas sin rebaja.
     * - Compras posteriores (first_purchase_completed_at definido): desde 1 pieza
     *   (no requiere acumular 6 piezas — el descuento sigue al cliente en cada compra).
     */
    public function bronzeMainDiscountPiecesThreshold(User $user): int
    {
        return $this->hasCompletedFirstPurchase($user)
            ? 1
            : self::BRONZE_PIECES_FIRST_PURCHASE;
    }

    /**
     * Indica si el cliente bronce cumple el mínimo de piezas para envío a domicilio.
     * Si el carrito está vacío o no alcanza el mínimo, debe retirar en tienda.
     */
    public function bronzeCanShip(User $user, array $items): bool
    {
        if (! $this->isBronze($user)) {
            return true;
        }

        $pieces = $this->countEligiblePieces($items);
        if ($pieces <= 0) {
            return false;
        }

        return $pieces >= $this->bronzeShippingPiecesThreshold($user);
    }

    /**
     * Bronce: ¿aplica el primer tramo (30 %)?
     * - Primera compra: ≥ 12 piezas sin rebaja.
     * - Compras posteriores (first_purchase_completed_at definido): desde 1 pieza.
     */
    public function shouldApplyBronzeMainDiscount(User $user, array $items): bool
    {
        if (! $this->isBronze($user)) {
            return false;
        }

        $pieces = $this->countEligiblePieces($items);
        if ($pieces <= 0) {
            return false;
        }

        return $pieces >= $this->bronzeMainDiscountPiecesThreshold($user);
    }

    /**
     * Bronce: ¿aplica el segundo tramo (10 %)?
     * Aplica a partir de 12 piezas sin rebaja, tanto en primera compra como en
     * compras posteriores (la fórmula del cálculo no cambia; sigue siendo 10 %
     * sobre el subtotal después del primer tramo).
     */
    public function shouldApplyBronzeSecondTier(User $user, array $items): bool
    {
        if (! $this->isBronze($user)) {
            return false;
        }

        $pieces = $this->countEligiblePieces($items);
        return $pieces >= self::BRONZE_PIECES_FIRST_PURCHASE;
    }

    /**
     * Cuando la API no trae descuento1: mismas reglas de elegibilidad que bronce para cualquier usuario.
     * Conservado para oro/diamante sin descuento1 desde API.
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

        $cat = $this->getSellerCategory($user);
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
        // Bronce: porcentaje fijo del 30 % si alcanza el umbral; si no, 0.
        if ($this->isBronze($user)) {
            return ['rate' => 0.30, 'percent' => 30];
        }

        $p = $this->fetchVolumePercentsFromExternalApi($user);

        return $this->volumeMainTierFromApiPercent($p['d1']);
    }

    /**
     * Para bronce, devuelve 10 si aplica segundo tramo en primera compra;
     * para el resto usa la API o 10 como fallback.
     *
     * @return array{rate: float, percent: int}
     */
    public function volumeExtraTier(User $user, array $items = []): array
    {
        if ($this->isBronze($user)) {
            $applies = $this->shouldApplyBronzeSecondTier($user, $items);
            return [
                'rate' => $applies ? 0.10 : 0.0,
                'percent' => $applies ? 10 : 0,
            ];
        }

        $p = $this->fetchVolumePercentsFromExternalApi($user);
        $percent = $this->volumeExtraPercentFromApiPercent($p['d2']);

        return [
            'rate' => round($percent / 100.0, 4),
            'percent' => (int) $percent,
        ];
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

        $volMain = 0.0;
        $volExtra = 0.0;
        $descuento1 = 0.0;
        $descuento2 = 0.0;

        if ($this->isBronze($user)) {
            $mainRate = 0.30;
            if ($this->shouldApplyBronzeMainDiscount($user, $items)) {
                $descuento1 = self::BRONZE_FIRST_TIER_PERCENT;
                $volMain = round($eligibleTotal * $mainRate, 2);
                $afterMain = round($eligibleTotal - $volMain, 2);

                $extraTier = $this->volumeExtraTier($user, $items);
                if ($extraTier['rate'] > 0) {
                    $volExtra = round($afterMain * $extraTier['rate'], 2);
                    $descuento2 = $extraTier['percent'];
                }
            }
        } else {
            $percents = $this->fetchVolumePercentsFromExternalApi($user);
            $hasApiMain = $this->apiProvidedMainPercent($percents['d1']);
            $tier = $this->volumeMainTierFromApiPercent($percents['d1']);
            $mainRate = $tier['rate'];
            $mainPercent = (float) $tier['percent'];
            $extraPercent = $this->volumeExtraPercentFromApiPercent($percents['d2']);
            $extraRate = round($extraPercent / 100.0, 4);

            $appliesMain = $hasApiMain
                ? $this->shouldApplyMainDiscount($user, $eligibleTotal)
                : $this->shouldApplyMainDiscountWhenNoApiMain($user, $eligibleTotal);

            if ($appliesMain) {
                $descuento1 = $mainPercent;
                $volMain = round($eligibleTotal * $mainRate, 2);
                $afterMain = round($eligibleTotal - $volMain, 2);

                // Con descuento1 desde API: segundo tramo aplica junto al primero (sin umbral $15k).
                // Sin API: se mantiene el umbral de $15k elegible para el segundo tramo.
                $applySecondTier = $hasApiMain
                    ? true
                    : ($eligibleTotal >= self::SECOND_TIER_ELIGIBLE_MIN);

                if ($applySecondTier) {
                    $volExtra = round($afterMain * $extraRate, 2);
                    $descuento2 = $extraPercent;
                }
            }
        }

        $volumeDiscount = round($volMain + $volExtra, 2);
        $discountedMerchandise = round(max(0.0, $linesSum - $volumeDiscount), 2);

        return [
            'lines_sum' => $linesSum,
            'eligible_total' => $eligibleTotal,
            'eligible_pieces' => $this->countEligiblePieces($items),
            'bronze_shipping_pieces_threshold' => $this->isBronze($user)
                ? $this->bronzeShippingPiecesThreshold($user)
                : null,
            'bronze_main_discount_pieces_threshold' => $this->isBronze($user)
                ? $this->bronzeMainDiscountPiecesThreshold($user)
                : null,
            'bronze_completed_first_purchase' => $this->isBronze($user)
                ? $this->hasCompletedFirstPurchase($user)
                : null,
            'volume_discount' => $volumeDiscount,
            'descuento1' => $descuento1,
            'descuento2' => $descuento2,
            'discounted_merchandise' => $discountedMerchandise,
        ];
    }
}
