<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

/**
 * Vigencia de categoría: 45 días desde la última compra exitosa.
 */
class UserSellerCategoryActivityService
{
    public const EXTENSION_DAYS = 45;

    public function recordSuccessfulPurchase(User $user, ?float $orderSubtotal = null, ?Carbon $at = null): void
    {
        $at ??= Carbon::now();

        $payload = [
            'categoria_last_purchase' => $at,
            'categoria_expires_at' => $at->copy()->addDays(self::EXTENSION_DAYS),
        ];

        $cat = strtolower((string) ($user->seller_category ?? ''));
        if ($cat === 'bronce') {
            $isActiveNow = (bool) ($user->bronze_benefit_active ?? false)
                && $user->benefit_expires_at
                && $at->lt($user->benefit_expires_at);

            $qualifiesByAmount = ($orderSubtotal ?? 0.0) >= 7000.0;
            $shouldActivateOrRenew = $isActiveNow || $qualifiesByAmount;

            if ($shouldActivateOrRenew) {
                $payload['bronze_benefit_active'] = true;
                $payload['benefit_expires_at'] = $at->copy()->addDays(self::EXTENSION_DAYS);
            }
        }

        $user->forceFill($payload)->save();
    }

    public function expireBronzeBenefitIfNeeded(User $user, ?Carbon $at = null): void
    {
        $at ??= Carbon::now();
        $cat = strtolower((string) ($user->seller_category ?? ''));
        if ($cat !== 'bronce') {
            return;
        }

        if (! (bool) ($user->bronze_benefit_active ?? false)) {
            return;
        }

        if (! $user->benefit_expires_at) {
            $user->forceFill(['bronze_benefit_active' => false])->save();
            return;
        }

        if ($at->gt($user->benefit_expires_at)) {
            $user->forceFill(['bronze_benefit_active' => false])->save();
        }
    }
}
