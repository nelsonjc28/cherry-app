<?php

namespace App\Services;

use App\Mail\AbandonedCartEmail;
use App\Models\CronMailLog;
use App\Models\Cart;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AbandonedCartEmailService
{
    public function __construct(
        protected CronMailLogService $cronMailLogService
    ) {}

    /**
     * @return array{encolados: int, errores: int, omitidos: int}
     */
    public function processAll(string $comando, string $origen = 'comando'): array
    {
        $encolados = 0;
        $errores = 0;
        $omitidos = 0;

        $this->cronMailLogService->abandonedCartCandidatesQuery()
            ->chunkById(100, function ($carts) use ($comando, $origen, &$encolados, &$errores, &$omitidos) {
                foreach ($carts as $cart) {
                    $result = $this->processCart($cart, $comando, $origen);

                    match ($result) {
                        'queued' => $encolados++,
                        'error' => $errores++,
                        'skipped' => $omitidos++,
                        default => null,
                    };
                }
            });

        $this->cronMailLogService->recordExecutionSummary($comando, [
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ], $origen);

        return [
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ];
    }

    /**
     * @return 'queued'|'skipped'|'error'|null
     */
    public function processCart(Cart $cart, string $comando, string $origen = 'comando'): ?string
    {
        $milestone = AbandonedCartSchedule::getDueMilestone($cart);
        if ($milestone === null) {
            return null;
        }

        $user = $cart->user;
        if (! $user || ! $user->email) {
            $this->cronMailLogService->recordSkipped(
                $comando,
                CronMailLog::TIPO_ABANDONED_CART,
                'Usuario sin email',
                $user?->id,
                $cart->id,
            );

            return 'skipped';
        }

        $items = $cart->items ?? [];
        if (! is_array($items) || count($items) === 0) {
            $this->cronMailLogService->recordSkipped(
                $comando,
                CronMailLog::TIPO_ABANDONED_CART,
                'Carrito sin ítems válidos',
                $user->id,
                $cart->id,
            );

            return 'skipped';
        }

        $preview = CartEmailPricingService::buildPreview($items, $user->seller_category ?? 'bronce');
        if (count($preview['lines']) === 0) {
            $this->cronMailLogService->recordSkipped(
                $comando,
                CronMailLog::TIPO_ABANDONED_CART,
                'Sin líneas de precio para el correo',
                $user->id,
                $cart->id,
            );

            return 'skipped';
        }

        $milestoneLabel = AbandonedCartSchedule::milestoneLabel($milestone);

        try {
            Mail::to($user->email)->queue(new AbandonedCartEmail($user, $cart, $preview));
            $cart->forceFill([
                'abandoned_email_stage' => $milestone,
                'last_notified_at' => now(),
            ])->save();

            $this->cronMailLogService->recordSuccess(
                $comando,
                CronMailLog::TIPO_ABANDONED_CART,
                $user->email,
                $user->id,
                $cart->id,
                null,
                "Carrito abandonado encolado ({$milestoneLabel}, etapa {$milestone}/".AbandonedCartSchedule::MAX_STAGE.')',
                $origen,
            );

            return 'queued';
        } catch (\Throwable $e) {
            $this->cronMailLogService->recordError(
                $comando,
                CronMailLog::TIPO_ABANDONED_CART,
                $e->getMessage(),
                $user->email,
                $user->id,
                $cart->id,
                $origen,
            );
            Log::error('mail:abandoned-cart queue failed', [
                'cart_id' => $cart->id,
                'user_id' => $user->id,
                'milestone' => $milestone,
                'message' => $e->getMessage(),
            ]);

            return 'error';
        }
    }

    public function countDue(): int
    {
        $count = 0;

        $this->cronMailLogService->abandonedCartCandidatesQuery()
            ->chunkById(100, function ($carts) use (&$count) {
                foreach ($carts as $cart) {
                    if (AbandonedCartSchedule::getDueMilestone($cart) !== null) {
                        $count++;
                    }
                }
            });

        return $count;
    }
}
