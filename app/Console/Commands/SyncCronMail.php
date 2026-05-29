<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class SyncCronMail extends Command
{
    protected $signature = 'mail:sync-cron
                            {--only= : Solo un comando: abandoned-cart | order-status}
                            {--dry-run : Listar pendientes sin encolar correos}';

    protected $description = 'Ejecuta los comandos de correo del cron (carrito abandonado y/o estatus de pedido)';

    protected $aliases = ['mail:run-cron'];

    public function handle(): int
    {
        $only = $this->option('only');
        $dryRun = (bool) $this->option('dry-run');

        $commands = [];

        if (! $only || $only === 'abandoned-cart') {
            $commands[] = 'mail:abandoned-cart';
        }

        if (! $only || $only === 'order-status') {
            $commands[] = 'mail:order-status-update';
        }

        if ($only && ! in_array($only, ['abandoned-cart', 'order-status'], true)) {
            $this->error('Valor --only inválido. Usar: abandoned-cart o order-status');

            return self::FAILURE;
        }

        if (empty($commands)) {
            $this->error('No hay comandos que ejecutar.');

            return self::FAILURE;
        }

        $this->info('=== Sincronización correos cron ===');
        if ($dryRun) {
            $this->warn('Modo dry-run: se usará mail:check-cron para listar pendientes.');
            $this->call('mail:check-cron');

            return self::SUCCESS;
        }

        $exitCode = self::SUCCESS;

        foreach ($commands as $cmd) {
            $this->newLine();
            $this->info("Ejecutando {$cmd}...");
            $code = Artisan::call($cmd);
            $this->line(trim(Artisan::output()));

            if ($code !== self::SUCCESS) {
                $exitCode = self::FAILURE;
            }
        }

        $this->newLine();
        $this->info('Supervisión post-ejecución:');
        $this->call('mail:check-cron');

        return $exitCode;
    }
}
