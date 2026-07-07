<?php

namespace App\Services;

use App\Models\Historial;
use Illuminate\Support\Facades\Log;

class ProductSyncHistorialService
{
    public function start(string $via = 'cli'): Historial
    {
        return Historial::create([
            'ejecutado_at' => now(),
            'estado' => 'exitoso',
            'mensaje' => "Sincronización iniciada ({$via})",
        ]);
    }

    /**
     * @param  array<string, int|float|string|null>  $stats
     */
    public function markSuccess(Historial $record, array $stats, string $via = 'cli'): void
    {
        try {
            $record->update([
                'ejecutado_at' => now(),
                'estado' => 'exitoso',
                'mensaje' => $this->buildSuccessMessage($stats, $via),
            ]);
        } catch (\Throwable $e) {
            Log::warning('ProductSyncHistorial: no se pudo registrar éxito', [
                'historial_id' => $record->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function markFailure(?Historial $record, string $error, string $via = 'cli'): void
    {
        $message = 'Error al sincronizar productos: '.$error;

        try {
            if ($record) {
                $record->update([
                    'ejecutado_at' => now(),
                    'estado' => 'error',
                    'mensaje' => $message." ({$via})",
                ]);

                return;
            }

            Historial::create([
                'ejecutado_at' => now(),
                'estado' => 'error',
                'mensaje' => $message." ({$via})",
            ]);
        } catch (\Throwable $e) {
            Log::warning('ProductSyncHistorial: no se pudo registrar error', [
                'historial_id' => $record?->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, int|float|string|null>  $stats
     */
    private function buildSuccessMessage(array $stats, string $via): string
    {
        $parts = [
            'Sincronización completada exitosamente',
            "via={$via}",
            'procesados='.($stats['total_productos'] ?? 0),
            'creados='.($stats['productos_creados'] ?? 0),
            'actualizados='.($stats['productos_actualizados'] ?? 0),
        ];

        if (isset($stats['productos_eliminados'])) {
            $parts[] = 'eliminados='.$stats['productos_eliminados'];
        }

        if (! empty($stats['poda_omitida'])) {
            $parts[] = 'poda_omitida=1';
        }

        return implode(' | ', $parts);
    }
}
