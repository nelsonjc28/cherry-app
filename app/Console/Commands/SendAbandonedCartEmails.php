<?php

namespace App\Console\Commands;

use App\Mail\AbandonedCartEmail;
use App\Models\CronMailLog;
use App\Services\CartEmailPricingService;
use App\Services\CronMailLogService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendAbandonedCartEmails extends Command
{
    protected $signature = 'mail:abandoned-cart';

    protected $description = 'Encola correos de carrito abandonado (cada 48h mientras haya ítems y el carrito lleve ≥48h sin actualizarse).';

    public function __construct(
        protected CronMailLogService $cronMailLogService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $comando = 'mail:abandoned-cart';
        $queued = 0;
        $errors = 0;
        $skipped = 0;

        $this->cronMailLogService->abandonedCartCandidatesQuery()
            ->chunkById(100, function ($carts) use ($comando, &$queued, &$errors, &$skipped) {
                foreach ($carts as $cart) {
                    $user = $cart->user;
                    if (! $user || ! $user->email) {
                        $skipped++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ABANDONED_CART,
                            'Usuario sin email',
                            $user?->id,
                            $cart->id,
                        );
                        continue;
                    }

                    $items = $cart->items ?? [];
                    if (! is_array($items) || count($items) === 0) {
                        $skipped++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ABANDONED_CART,
                            'Carrito sin ítems válidos',
                            $user->id,
                            $cart->id,
                        );
                        continue;
                    }

                    $preview = CartEmailPricingService::buildPreview($items, $user->seller_category ?? 'bronce');
                    if (count($preview['lines']) === 0) {
                        $skipped++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ABANDONED_CART,
                            'Sin líneas de precio para el correo',
                            $user->id,
                            $cart->id,
                        );
                        continue;
                    }

                    try {
                        Mail::to($user->email)->queue(new AbandonedCartEmail($user, $cart, $preview));
                        $cart->forceFill(['last_notified_at' => now()])->save();
                        $queued++;

                        $this->cronMailLogService->recordSuccess(
                            $comando,
                            CronMailLog::TIPO_ABANDONED_CART,
                            $user->email,
                            $user->id,
                            $cart->id,
                            null,
                            'Carrito abandonado encolado',
                        );
                    } catch (\Throwable $e) {
                        $errors++;
                        $this->cronMailLogService->recordError(
                            $comando,
                            CronMailLog::TIPO_ABANDONED_CART,
                            $e->getMessage(),
                            $user->email,
                            $user->id,
                            $cart->id,
                        );
                        Log::error('mail:abandoned-cart queue failed', [
                            'cart_id' => $cart->id,
                            'user_id' => $user->id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->cronMailLogService->recordExecutionSummary($comando, [
            'encolados' => $queued,
            'errores' => $errors,
            'omitidos' => $skipped,
        ]);

        $this->info("Abandoned cart: {$queued} encolado(s), {$errors} error(es), {$skipped} omitido(s).");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }
}
