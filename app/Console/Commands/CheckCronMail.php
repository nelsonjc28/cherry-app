<?php

namespace App\Console\Commands;

use App\Models\CronMailLog;
use App\Services\AbandonedCartEmailService;
use App\Services\CronMailLogService;
use Illuminate\Console\Command;

class CheckCronMail extends Command
{
    protected $signature = 'mail:check-cron
                            {--comando= : Filtrar por comando (mail:abandoned-cart, mail:order-status-update)}
                            {--errors : Mostrar solo errores recientes en el historial}
                            {--days=7 : Días hacia atrás para errores recientes}';

    protected $description = 'Supervisar correos automáticos del cron (carrito abandonado y estatus de pedido)';

    public function __construct(
        protected CronMailLogService $cronMailLogService,
        protected AbandonedCartEmailService $abandonedCartEmailService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $comandoFilter = $this->option('comando');
        $errorsOnly = (bool) $this->option('errors');
        $days = max(1, (int) $this->option('days'));

        $this->info('=== Supervisión correos cron ===');
        $this->newLine();

        $commands = [
            'mail:abandoned-cart' => [
                'label' => 'Carrito abandonado',
                'schedule' => 'cada 15 min (1h, 24h, 36h)',
            ],
            'mail:order-status-update' => [
                'label' => 'Estatus de pedido (enviado/entregado)',
                'schedule' => 'cada hora',
            ],
        ];

        $totalPending = 0;

        foreach ($commands as $cmd => $meta) {
            if ($comandoFilter && $comandoFilter !== $cmd) {
                continue;
            }

            $this->info("--- {$meta['label']} ({$cmd}) ---");
            $this->line("Programación: {$meta['schedule']}");

            $pending = $cmd === 'mail:abandoned-cart'
                ? $this->abandonedCartEmailService->countDue()
                : $this->cronMailLogService->orderStatusCandidatesQuery()->count();

            $this->line("Pendientes de encolar: {$pending}");

            $lastSummary = CronMailLog::query()
                ->where('comando', $cmd)
                ->where('tipo_correo', CronMailLog::TIPO_RESUMEN)
                ->orderByDesc('ejecutado_at')
                ->first();

            if ($lastSummary) {
                $stats = json_decode((string) $lastSummary->mensaje, true) ?: [];
                $this->line('Última ejecución: '.$lastSummary->ejecutado_at->format('Y-m-d H:i:s'));
                $this->line(sprintf(
                    '  Encolados: %d | Errores: %d | Omitidos: %d | Estado: %s',
                    (int) ($stats['encolados'] ?? 0),
                    (int) ($stats['errores'] ?? 0),
                    (int) ($stats['omitidos'] ?? 0),
                    $lastSummary->estado
                ));
            } else {
                $this->warn('  Sin registro de ejecución en cron_mail_logs (ejecutar mail:sync-cron o el comando individual).');
            }

            $recentErrors = CronMailLog::query()
                ->where('comando', $cmd)
                ->where('estado', CronMailLog::ESTADO_ERROR)
                ->where('tipo_correo', '!=', CronMailLog::TIPO_RESUMEN)
                ->where('ejecutado_at', '>=', now()->subDays($days))
                ->orderByDesc('ejecutado_at')
                ->limit(10)
                ->get();

            if ($recentErrors->isNotEmpty()) {
                $this->warn("  Errores últimos {$days} días ({$recentErrors->count()}):");
                foreach ($recentErrors as $log) {
                    $ref = $log->order_id
                        ? "orden #{$log->order_id}"
                        : ($log->cart_id ? "carrito #{$log->cart_id}" : '-');
                    $this->line("    - [{$log->ejecutado_at->format('Y-m-d H:i')}] {$ref} {$log->email_destino}: ".mb_substr((string) $log->mensaje, 0, 80));
                }
            }

            $this->newLine();
        }

        if ($errorsOnly) {
            $this->info('=== Historial de errores (detalle) ===');
            $errorQuery = CronMailLog::query()
                ->where('estado', CronMailLog::ESTADO_ERROR)
                ->where('tipo_correo', '!=', CronMailLog::TIPO_RESUMEN)
                ->where('ejecutado_at', '>=', now()->subDays($days))
                ->orderByDesc('ejecutado_at');

            if ($comandoFilter) {
                $errorQuery->where('comando', $comandoFilter);
            }

            $errors = $errorQuery->limit(50)->get();

            if ($errors->isEmpty()) {
                $this->info('No hay errores en el período.');

                return self::SUCCESS;
            }

            $tableData = $errors->map(fn (CronMailLog $log) => [
                'ID' => $log->id,
                'Comando' => $log->comando,
                'Tipo' => $log->tipo_correo,
                'Email' => $log->email_destino ?? '-',
                'Orden' => $log->order_id ?? '-',
                'Carrito' => $log->cart_id ?? '-',
                'Fecha' => $log->ejecutado_at->format('Y-m-d H:i:s'),
                'Mensaje' => mb_substr((string) $log->mensaje, 0, 60),
            ])->all();

            $this->table(
                ['ID', 'Comando', 'Tipo', 'Email', 'Orden', 'Carrito', 'Fecha', 'Mensaje'],
                $tableData
            );
        }

        if ($totalPending > 0) {
            $this->warn('Hay trabajo pendiente. Ejecutar: php artisan mail:sync-cron');
        }

        return self::SUCCESS;
    }
}
