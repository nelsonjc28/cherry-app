<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Vigencia de ofertas por día calendario (inicio y fin inclusive, sin hora).
 */
final class CatalogOfferDate
{
    public static function isActiveOnDate($startDate, $endDate, ?Carbon $on = null): bool
    {
        $day = ($on ?? now())->copy()->startOfDay();

        if ($startDate) {
            $start = Carbon::parse($startDate)->startOfDay();
            if ($day->lt($start)) {
                return false;
            }
        }

        if ($endDate) {
            $end = Carbon::parse($endDate)->endOfDay();
            if ($day->gt($end)) {
                return false;
            }
        }

        return true;
    }

    public static function catalogRebajaPercent(float $descPromo): float
    {
        if ($descPromo <= 0.0001) {
            return 0.0;
        }

        return max(0.0, $descPromo - 10.0);
    }

    public static function catalogUnitPrice(float $listPrice, float $descPromo): float
    {
        if ($listPrice <= 0) {
            return 0.0;
        }

        $pct = self::catalogRebajaPercent($descPromo);

        if ($pct <= 0) {
            return $listPrice;
        }

        return max(0.0, $listPrice * (1.0 - $pct / 100.0));
    }
}
