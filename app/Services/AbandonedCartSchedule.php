<?php

namespace App\Services;

use App\Models\Cart;
use Carbon\CarbonInterface;

class AbandonedCartSchedule
{
    /** @var array<int, array{label: string, hours?: int, days?: int}> */
    public const MILESTONES = [
        1 => ['label' => '3 horas', 'hours' => 3],
        2 => ['label' => '1 día', 'days' => 1],
        3 => ['label' => '3 días', 'days' => 3],
        4 => ['label' => '1 semana', 'days' => 7],
        5 => ['label' => '2 semanas', 'days' => 14],
        6 => ['label' => '1 mes', 'days' => 30],
    ];

    public const MAX_STAGE = 6;

    public const CAMPAIGN_DAYS = 30;

    public static function referenceTime(Cart $cart): CarbonInterface
    {
        return $cart->abandonment_started_at ?? $cart->created_at;
    }

    public static function isPastCampaignEnd(Cart $cart): bool
    {
        return now()->gt(static::referenceTime($cart)->copy()->addDays(self::CAMPAIGN_DAYS));
    }

    /**
     * Hito más alto ya vencido y aún no enviado (1-6), o null si no corresponde enviar.
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
        $config = self::MILESTONES[$milestone];
        $dueAt = $reference->copy();

        if (isset($config['hours'])) {
            return $dueAt->addHours($config['hours']);
        }

        return $dueAt->addDays($config['days']);
    }

    public static function milestoneLabel(int $milestone): string
    {
        return self::MILESTONES[$milestone]['label'] ?? "etapa {$milestone}";
    }
}
