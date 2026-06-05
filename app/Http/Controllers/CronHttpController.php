<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Disparar tareas de cron vía HTTP (panel de hosting con curl/wget).
 */
class CronHttpController extends Controller
{
    public function abandonedCart(Request $request): JsonResponse
    {
        return $this->runArtisan('mail:abandoned-cart');
    }

    public function orderStatus(Request $request): JsonResponse
    {
        return $this->runArtisan('mail:order-status-update');
    }

    public function syncMail(Request $request): JsonResponse
    {
        $params = [];
        $only = $request->query('only');
        if (is_string($only) && in_array($only, ['abandoned-cart', 'order-status'], true)) {
            $params['--only'] = $only;
        }

        return $this->runArtisan('mail:sync-cron', $params);
    }

    public function processQueue(Request $request): JsonResponse
    {
        return $this->runArtisan('queue:work', [
            '--stop-when-empty' => true,
            '--tries' => 3,
        ]);
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    protected function runArtisan(string $command, array $parameters = []): JsonResponse
    {
        set_time_limit(0);
        ini_set('max_execution_time', '0');

        $exitCode = Artisan::call($command, $parameters);
        $output = trim(Artisan::output());

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command,
            'exit_code' => $exitCode,
            'output' => $output,
        ], $exitCode === 0 ? 200 : 500);
    }
}
