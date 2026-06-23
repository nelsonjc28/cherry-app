<?php

namespace App\Services;

use App\Models\Cart;
use Carbon\CarbonInterface;

class AbandonedCartSchedule
{
    /** @var array<int, array{label: string, hours: int}> */
    public const MILESTONES = [
        1 => ['label' => '1 hora', 'hours' => 1],
        2 => ['label' => '24 horas', 'hours' => 24],
        3 => ['label' => '36 horas', 'hours' => 36],
    ];

    public const MAX_STAGE = 3;

    public const CAMPAIGN_HOURS = 36;

    public static function referenceTime(Cart $cart): CarbonInterface
    {
        return $cart->abandonment_started_at ?? $cart->created_at;
    }

    public static function isPastCampaignEnd(Cart $cart): bool
    {
        return now()->gt(static::referenceTime($cart)->copy()->addHours(self::CAMPAIGN_HOURS));
    }

    /**
     * Hito más alto ya vencido y aún no enviado (1-3), o null si no corresponde enviar.
     */
    public static function getDueMilestone(Cart $cart): ?int
    {
        if (static::isPastCampaignEnd($cart)) {
            return null;
        }

        $stage = (int) ($cart->abandoned_email_stage ?? 0);
        if ($stage >= self::MAX_STAGE) {
            return null;
        }

        $reference = static::referenceTime($cart);
        $dueMilestone = null;

        for ($milestone = $stage + 1; $milestone <= self::MAX_STAGE; $milestone++) {
            if (now()->gte(static::milestoneDueAt($reference, $milestone))) {
                $dueMilestone = $milestone;
            }
        }

        return $dueMilestone;
    }

    public static function milestoneDueAt(CarbonInterface $reference, int $milestone): CarbonInterface
    {
        return $reference->copy()->addHours(self::MILESTONES[$milestone]['hours']);
    }

    public static function milestoneLabel(int $milestone): string
    {
        return self::MILESTONES[$milestone]['label'] ?? "etapa {$milestone}";
    }
}
