<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalClienteAccountService
{
    private const DEFAULT_CLIENTE_API_BASE = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/cliente';

    /**
     * @return array{
     *   success: bool,
     *   message?: string,
     *   external_client_id: string,
     *   nombre?: string|null,
     *   summary?: array{
     *     limite_credito: float,
     *     saldo: float,
     *     vencido: float,
     *     disponible: float
     *   },
     *   documentos?: list<array{
     *     fecha: string,
     *     vence: string,
     *     atraso: float,
     *     refer: string,
     *     doc: string,
     *     cargo: float,
     *     abono: float,
     *     saldo: float
     *   }>
     * }
     */
    public function fetchAccountStatement(int $userId, float $creditLimit = 0): array
    {
        $externalId = ExternalClienteDiscountService::formatExternalClienteId($userId);
        $base = rtrim((string) config('cherry.cliente_api_base', self::DEFAULT_CLIENTE_API_BASE), '/');
        if ($base === '') {
            $base = rtrim(self::DEFAULT_CLIENTE_API_BASE, '/');
        }

        $url = $base.'/'.$externalId;

        try {
            $response = Http::timeout(25)
                ->withoutVerifying()
                ->get($url);
        } catch (\Throwable $e) {
            Log::warning('External cliente account API: error de conexión', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'No se pudo conectar a la API de clientes: '.$e->getMessage(),
                'external_client_id' => $externalId,
            ];
        }

        if (! $response->successful()) {
            return [
                'success' => false,
                'message' => 'La API de clientes respondió con código '.$response->status(),
                'external_client_id' => $externalId,
            ];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return [
                'success' => false,
                'message' => 'La API de clientes no devolvió JSON válido',
                'external_client_id' => $externalId,
            ];
        }

        $data = data_get($json, 'data');
        if (! is_array($data)) {
            return [
                'success' => false,
                'message' => data_get($json, 'message', 'Respuesta de API sin datos de cliente'),
                'external_client_id' => $externalId,
            ];
        }

        $documentos = $this->mapDocumentos($data['documentos'] ?? []);
        $summary = $this->buildSummary($data, $documentos, $creditLimit);

        return [
            'success' => true,
            'external_client_id' => $externalId,
            'nombre' => isset($data['nombre']) ? (string) $data['nombre'] : null,
            'summary' => $summary,
            'documentos' => $documentos,
        ];
    }

    /**
     * @param  mixed  $rawDocumentos
     * @return list<array{
     *   fecha: string,
     *   vence: string,
     *   atraso: float,
     *   refer: string,
     *   doc: string,
     *   cargo: float,
     *   abono: float,
     *   saldo: float
     * }>
     */
    private function mapDocumentos(mixed $rawDocumentos): array
    {
        if (! is_array($rawDocumentos)) {
            return [];
        }

        $rows = [];
        foreach ($rawDocumentos as $doc) {
            if (! is_array($doc)) {
                continue;
            }

            $referencia = trim((string) ($doc['referencia'] ?? ''));
            if ($referencia !== '' && ! str_contains($referencia, '-')) {
                $referencia = '0-'.$referencia;
            }

            $rows[] = [
                'fecha' => (string) ($doc['fecha'] ?? ''),
                'vence' => (string) ($doc['vence'] ?? ''),
                'atraso' => (float) ($doc['atraso'] ?? 0),
                'refer' => $referencia,
                'doc' => (string) ($doc['doc'] ?? ''),
                'cargo' => round((float) ($doc['cargo'] ?? 0), 2),
                'abono' => round((float) ($doc['abono'] ?? 0), 2),
                'saldo' => round((float) ($doc['saldo'] ?? 0), 2),
            ];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $documentos
     * @return array{
     *   limite_credito: float,
     *   saldo: float,
     *   vencido: float,
     *   disponible: float
     * }
     */
    private function buildSummary(array $data, array $documentos, float $creditLimit): array
    {
        // La API externa ahora entrega el bloque 'credito' anidado:
        //   credito: { creditoLimite, creditoUsado, creditoSaldo }
        $credito = is_array($data['credito'] ?? null) ? $data['credito'] : [];

        // NOTA: NO incluir 'credito' aqui: es ARRAY y (float)$array en PHP = 1
        $limite = $this->pickNumeric($data, [
            'limiteCredito', 'limite_credito', 'LimiteCredito', 'limite',
        ]);
        if ($limite === null) {
            $limite = $this->pickNumeric($credito, ['creditoLimite', 'limiteCredito', 'limite_credito']);
        }
        if ($limite === null) {
            $limite = max(0, $creditLimit);
        }

        // Credito usado: priorizar bloquee 'credito' de la API
        $saldoApi = $this->pickNumeric($credito, ['creditoUsado', 'credito_usado', 'usado'])
            ?? $this->pickNumeric($data, ['saldo', 'Saldo', 'saldoTotal', 'saldo_total']);

        $vencidoApi = $this->pickNumeric($data, ['vencido', 'Vencido', 'saldoVencido', 'saldo_vencido']);

        // Credito disponible (saldo libre): priorizar bloquee 'credito' de la API
        $disponibleApi = $this->pickNumeric($credito, ['creditoSaldo', 'credito_saldo', 'saldo'])
            ?? $this->pickNumeric($data, ['disponible', 'Disponible', 'creditoDisponible', 'credito_disponible']);

        $saldoDocs = 0.0;
        $vencidoDocs = 0.0;
        foreach ($documentos as $doc) {
            $lineSaldo = (float) ($doc['saldo'] ?? 0);
            $saldoDocs += $lineSaldo;
            if ((float) ($doc['atraso'] ?? 0) > 0) {
                $vencidoDocs += $lineSaldo;
            }
        }

        $saldo = $saldoApi ?? round($saldoDocs, 2);
        $vencido = $vencidoApi ?? round($vencidoDocs, 2);
        $disponible = $disponibleApi ?? round(max(0, $limite - $saldo), 2);

        return [
            'limite_credito' => round($limite, 2),
            'saldo' => $saldo,
            'vencido' => $vencido,
            'disponible' => $disponible,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $keys
     */
    private function pickNumeric(array $data, array $keys): ?float
    {
        foreach ($keys as $key) {
            if (! array_key_exists($key, $data) || $data[$key] === null || $data[$key] === '') {
                continue;
            }

            return round((float) $data[$key], 2);
        }

        return null;
    }
}
