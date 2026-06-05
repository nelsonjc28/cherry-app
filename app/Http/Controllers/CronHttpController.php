<?php

namespace App\Http\Controllers;

use App\Models\CronMailLog;
use App\Services\CronMailLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Disparar tareas de cron vía HTTP (panel de hosting con curl/wget).
 */
class CronHttpController extends Controller
{
    public function __construct(
        protected CronMailLogService $cronMailLogService
    ) {}

    public function abandonedCart(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $command = 'mail:abandoned-cart';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $command,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $exitCode = Artisan::call($command);
        $output = trim(Artisan::output());
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('Cron HTTP: comando finalizado', [
            'route' => $route,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        $this->cronMailLogService->record(
            $command,
            CronMailLog::TIPO_RESUMEN,
            $exitCode === 0 ? CronMailLog::ESTADO_EXITOSO : CronMailLog::ESTADO_ERROR,
            null,
            null,
            null,
            null,
            json_encode([
                'via' => 'http',
                'route' => $route,
                'ip' => $ip,
                'exit_code' => $exitCode,
                'duration_ms' => $durationMs,
                'output' => $output,
            ], JSON_UNESCAPED_UNICODE),
            'http',
        );

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command,
            'exit_code' => $exitCode,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $exitCode === 0 ? 200 : 500);
    }

    public function orderStatus(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $command = 'mail:order-status-update';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $command,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $exitCode = Artisan::call($command);
        $output = trim(Artisan::output());
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('Cron HTTP: comando finalizado', [
            'route' => $route,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        $this->cronMailLogService->record(
            $command,
            CronMailLog::TIPO_RESUMEN,
            $exitCode === 0 ? CronMailLog::ESTADO_EXITOSO : CronMailLog::ESTADO_ERROR,
            null,
            null,
            null,
            null,
            json_encode([
                'via' => 'http',
                'route' => $route,
                'ip' => $ip,
                'exit_code' => $exitCode,
                'duration_ms' => $durationMs,
                'output' => $output,
            ], JSON_UNESCAPED_UNICODE),
            'http',
        );

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command,
            'exit_code' => $exitCode,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $exitCode === 0 ? 200 : 500);
    }

    public function syncMail(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $command = 'mail:sync-cron';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        $params = [];
        $only = $request->query('only');
        if (is_string($only) && in_array($only, ['abandoned-cart', 'order-status'], true)) {
            $params['--only'] = $only;
        }

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $command,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
            'params' => $params,
        ]);

        $exitCode = Artisan::call($command, $params);
        $output = trim(Artisan::output());
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('Cron HTTP: comando finalizado', [
            'route' => $route,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        $this->cronMailLogService->record(
            $command,
            CronMailLog::TIPO_RESUMEN,
            $exitCode === 0 ? CronMailLog::ESTADO_EXITOSO : CronMailLog::ESTADO_ERROR,
            null,
            null,
            null,
            null,
            json_encode([
                'via' => 'http',
                'route' => $route,
                'ip' => $ip,
                'exit_code' => $exitCode,
                'duration_ms' => $durationMs,
                'output' => $output,
                'params' => $params,
            ], JSON_UNESCAPED_UNICODE),
            'http',
        );

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command,
            'exit_code' => $exitCode,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $exitCode === 0 ? 200 : 500);
    }

    public function processQueue(Request $request): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $command = 'queue:work';
        $route = '/'.$request->path();
        $ip = (string) $request->ip();
        $startedAt = microtime(true);

        $params = [
            '--stop-when-empty' => true,
            '--tries' => 3,
        ];

        Log::info('Cron HTTP: solicitud recibida', [
            'route' => $route,
            'command' => $command,
            'ip' => $ip,
            'user_agent' => $request->userAgent(),
        ]);

        $exitCode = Artisan::call($command, $params);
        $output = trim(Artisan::output());
        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        Log::info('Cron HTTP: comando finalizado', [
            'route' => $route,
            'command' => $command,
            'exit_code' => $exitCode,
            'duration_ms' => $durationMs,
            'output' => $output,
        ]);

        $this->cronMailLogService->record(
            $command,
            CronMailLog::TIPO_RESUMEN,
            $exitCode === 0 ? CronMailLog::ESTADO_EXITOSO : CronMailLog::ESTADO_ERROR,
            null,
            null,
            null,
            null,
            json_encode([
                'via' => 'http',
                'route' => $route,
                'ip' => $ip,
                'exit_code' => $exitCode,
                'duration_ms' => $durationMs,
                'output' => $output,
            ], JSON_UNESCAPED_UNICODE),
            'http',
        );

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command,
            'exit_code' => $exitCode,
            'output' => $output,
            'route' => $route,
            'logged' => true,
            'duration_ms' => $durationMs,
        ], $exitCode === 0 ? 200 : 500);
    }
}
