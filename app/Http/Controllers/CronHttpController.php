<?php

namespace App\Http\Controllers;

use App\Mail\OrderStatusEmail;
use App\Models\CronMailLog;
use App\Services\AbandonedCartEmailService;
use App\Services\CartEmailPricingService;
use App\Services\CronMailLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Throwable;

/**
 * Disparar tareas de cron vía HTTP (panel de hosting con curl/wget).
 * La lógica de encolado y registros vive aquí; no se delega a Artisan.
 */
class CronHttpController extends Controller
{
    public function __construct(
        protected CronMailLogService $cronMailLogService,
        protected AbandonedCartEmailService $abandonedCartEmailService,
    ) {}

    public function abandonedCart(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $comando = 'mail:abandoned-cart';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $encolados = 0;
        $errores = 0;
        $omitidos = 0;

        $stats = $this->abandonedCartEmailService->processAll($comando, 'http');
        $encolados = $stats['encolados'];
        $errores = $stats['errores'];
        $omitidos = $stats['omitidos'];

        $output = "Abandoned cart: {$encolados} encolado(s), {$errores} error(es), {$omitidos} omitido(s).";
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $success = $errores === 0;

        Log::info('Cron HTTP: ejecución finalizada', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        return response()->json([
            'success' => $success,
            'command' => $comando,
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $success ? 200 : 500);
    }

    public function orderStatus(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $comando = 'mail:order-status-update';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $encolados = 0;
        $errores = 0;
        $omitidos = 0;

        $this->cronMailLogService->orderStatusCandidatesQuery()
            ->orderBy('id')
            ->chunkById(50, function ($orders) use ($comando, &$encolados, &$errores, &$omitidos) {
                foreach ($orders as $order) {
                    $user = $order->user;
                    if (! $user || ! $user->email) {
                        $omitidos++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            'Usuario sin email',
                            $user?->id,
                            null,
                            $order->id,
                        );
                        continue;
                    }

                    try {
                        Mail::to($user->email)->queue(new OrderStatusEmail($order));
                        $order->forceFill([
                            'fulfillment_email_last_status' => $order->status,
                        ])->save();
                        $encolados++;

                        $this->cronMailLogService->recordSuccess(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                            "Estatus «{$order->status}» encolado",
                            'http',
                        );
                    } catch (Throwable $e) {
                        $errores++;
                        $this->cronMailLogService->recordError(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $e->getMessage(),
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                            'http',
                        );
                        Log::error('Cron HTTP mail:order-status-update queue failed', [
                            'order_id' => $order->id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->cronMailLogService->recordExecutionSummary($comando, [
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ], 'http');

        $output = "Order status: {$encolados} encolado(s), {$errores} error(es), {$omitidos} omitido(s).";
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $success = $errores === 0;

        Log::info('Cron HTTP: ejecución finalizada', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        return response()->json([
            'success' => $success,
            'command' => $comando,
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $success ? 200 : 500);
    }

    public function syncMail(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);
        $only = $request->query('only');

        if ($only && ! in_array($only, ['abandoned-cart', 'order-status'], true)) {
            return response()->json([
                'success' => false,
                'command' => 'mail:sync-cron',
                'output' => 'Parámetro only inválido. Usar: abandoned-cart o order-status',
                'route' => $route,
                'logged' => false,
            ], 400);
        }

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => 'mail:sync-cron',
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
            'only' => $only,
        ]);

        $outputs = [];
        $hasErrors = false;

        if (! $only || $only === 'abandoned-cart') {
            $stats = $this->encolarCorreosCarritoAbandonado();
            $outputs[] = "Abandoned cart: {$stats['encolados']} encolado(s), {$stats['errores']} error(es), {$stats['omitidos']} omitido(s).";
            $hasErrors = $hasErrors || $stats['errores'] > 0;
        }

        if (! $only || $only === 'order-status') {
            $stats = $this->encolarCorreosEstatusPedido();
            $outputs[] = "Order status: {$stats['encolados']} encolado(s), {$stats['errores']} error(es), {$stats['omitidos']} omitido(s).";
            $hasErrors = $hasErrors || $stats['errores'] > 0;
        }

        $output = implode("\n", $outputs);
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('Cron HTTP: ejecución finalizada', [
            'route' => $route,
            'command' => 'mail:sync-cron',
            'ip' => $ip,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        return response()->json([
            'success' => ! $hasErrors,
            'command' => 'mail:sync-cron',
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $hasErrors ? 500 : 200);
    }

    public function processQueue(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $comando = 'queue:work';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $processed = 0;
        $errors = 0;
        $connection = Queue::connection();
        $queueName = (string) config('queue.connections.'.config('queue.default').'.queue', 'default');

        while ($job = $connection->pop($queueName)) {
            try {
                $job->fire();
                $processed++;
            } catch (Throwable $e) {
                $errors++;
                Log::error('Cron HTTP queue:work job failed', [
                    'message' => $e->getMessage(),
                ]);
                if (method_exists($job, 'fail')) {
                    $job->fail($e);
                }
            }
        }

        $this->cronMailLogService->record(
            $comando,
            CronMailLog::TIPO_RESUMEN,
            $errors === 0 ? CronMailLog::ESTADO_EXITOSO : CronMailLog::ESTADO_ERROR,
            null,
            null,
            null,
            null,
            json_encode([
                'via' => 'http',
                'route' => $route,
                'ip' => $ip,
                'procesados' => $processed,
                'errores' => $errors,
            ], JSON_UNESCAPED_UNICODE),
            'http',
        );

        $output = "Queue: {$processed} job(s) procesado(s), {$errors} error(es).";
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);
        $success = $errors === 0;

        Log::info('Cron HTTP: ejecución finalizada', [
            'route' => $route,
            'command' => $comando,
            'ip' => $ip,
            'procesados' => $processed,
            'errores' => $errors,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        return response()->json([
            'success' => $success,
            'command' => $comando,
            'procesados' => $processed,
            'errores' => $errors,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $success ? 200 : 500);
    }

    /**
     * @return array{encolados: int, errores: int, omitidos: int}
     */
    protected function encolarCorreosCarritoAbandonado(): array
    {
        return $this->abandonedCartEmailService->processAll('mail:abandoned-cart', 'http');
    }

    /**
     * @return array{encolados: int, errores: int, omitidos: int}
     */
    protected function encolarCorreosEstatusPedido(): array
    {
        $comando = 'mail:order-status-update';
        $encolados = 0;
        $errores = 0;
        $omitidos = 0;

        $this->cronMailLogService->orderStatusCandidatesQuery()
            ->orderBy('id')
            ->chunkById(50, function ($orders) use ($comando, &$encolados, &$errores, &$omitidos) {
                foreach ($orders as $order) {
                    $user = $order->user;
                    if (! $user || ! $user->email) {
                        $omitidos++;
                        $this->cronMailLogService->recordSkipped(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            'Usuario sin email',
                            $user?->id,
                            null,
                            $order->id,
                        );
                        continue;
                    }

                    try {
                        Mail::to($user->email)->queue(new OrderStatusEmail($order));
                        $order->forceFill([
                            'fulfillment_email_last_status' => $order->status,
                        ])->save();
                        $encolados++;

                        $this->cronMailLogService->recordSuccess(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                            "Estatus «{$order->status}» encolado",
                            'http',
                        );
                    } catch (Throwable $e) {
                        $errores++;
                        $this->cronMailLogService->recordError(
                            $comando,
                            CronMailLog::TIPO_ORDER_STATUS,
                            $e->getMessage(),
                            $user->email,
                            $user->id,
                            null,
                            $order->id,
                            'http',
                        );
                        Log::error('Cron HTTP mail:order-status-update queue failed', [
                            'order_id' => $order->id,
                            'message' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->cronMailLogService->recordExecutionSummary($comando, [
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ], 'http');

        return [
            'encolados' => $encolados,
            'errores' => $errores,
            'omitidos' => $omitidos,
        ];
    }
}
