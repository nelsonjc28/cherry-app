<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Consulta informativa de descuentos en la API de clientes (mismo criterio de id que {@see ExternalSalesService::prepareClienteData}).
 */
class ExternalClienteDiscountService
{
    private const DEFAULT_CLIENTE_API_BASE = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/cliente';

    public static function formatExternalClienteId(int $userId): string
    {
        return 'DM'.str_pad((string) $userId, 5, '0', STR_PAD_LEFT);
    }

    /**
     * @return array{
     *   success: bool,
     *   message?: string,
     *   external_client_id: string,
     *   descuento1: string|null,
     *   descuento2: string|null,
     *   idvendedor: string|null,
     *   nombre_vendedor: string|null
     * }
     */
    public function fetchByUserId(int $userId): array
    {
        $externalId = self::formatExternalClienteId($userId);
        $base = rtrim((string) config('cherry.cliente_api_base', self::DEFAULT_CLIENTE_API_BASE), '/');
        if ($base === '') {
            $base = rtrim(self::DEFAULT_CLIENTE_API_BASE, '/');
        }

        $url = $base.'/'.$externalId;

        try {
            $response = Http::timeout(20)
                ->withoutVerifying()
                ->get($url);
        } catch (\Throwable $e) {
            Log::warning('External cliente API: error de conexión', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'No se pudo conectar a la API de clientes: '.$e->getMessage(),
                'external_client_id' => $externalId,
                'descuento1' => null,
                'descuento2' => null,
                'idvendedor' => null,
                'nombre_vendedor' => null,
            ];
        }

        if (! $response->successful()) {
            Log::info('External cliente API: respuesta no exitosa', [
                'url' => $url,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => 'La API de clientes respondió con código '.$response->status(),
                'external_client_id' => $externalId,
                'descuento1' => null,
                'descuento2' => null,
                'idvendedor' => null,
                'nombre_vendedor' => null,
            ];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return [
                'success' => false,
                'message' => 'La API de clientes no devolvió JSON',
                'external_client_id' => $externalId,
                'descuento1' => null,
                'descuento2' => null,
                'idvendedor' => null,
                'nombre_vendedor' => null,
            ];
        }

        $d1 = $this->pickDiscountValue($json, 1);
        $d2 = $this->pickDiscountValue($json, 2);
        $idvendedor = $this->pickNestedValue($json, ['idVendedor', 'IdVendedor', 'id_vendedor', 'idvendedor']);
        $nombreVendedor = $this->pickNestedValue($json, ['nombreVendedor', 'NombreVendedor', 'nombre_vendedor', 'nombrevendedor']);

        return [
            'success' => true,
            'external_client_id' => $externalId,
            'descuento1' => $d1,
            'descuento2' => $d2,
            'idvendedor' => $idvendedor !== null && $idvendedor !== '' ? (string) $idvendedor : null,
            'nombre_vendedor' => $nombreVendedor !== null && $nombreVendedor !== '' ? (string) $nombreVendedor : null,
        ];
    }

    /**
     * Mismos campos que {@see fetchByUserId} pero como porcentajes numéricos para precios.
     *
     * @return array{
     *   success: bool,
     *   message?: string,
     *   external_client_id: string,
     *   descuento1: float|null,
     *   descuento2: float|null,
     *   idvendedor: string|null,
     *   nombre_vendedor: string|null
     * }
     */
    public function fetchDiscountPercents(int $userId): array
    {
        $r = $this->fetchByUserId($userId);

        if (! $r['success']) {
            return [
                'success' => false,
                'message' => $r['message'] ?? null,
                'external_client_id' => $r['external_client_id'],
                'descuento1' => null,
                'descuento2' => null,
                'idvendedor' => null,
                'nombre_vendedor' => null,
            ];
        }

        return [
            'success' => true,
            'external_client_id' => $r['external_client_id'],
            'descuento1' => $this->normalizePercentDisplayValue($r['descuento1']),
            'descuento2' => $this->normalizePercentDisplayValue($r['descuento2']),
            'idvendedor' => $r['idvendedor'] ?? null,
            'nombre_vendedor' => $r['nombre_vendedor'] ?? null,
        ];
    }

    private function normalizePercentDisplayValue(?string $s): ?float
    {
        if ($s === null || $s === '') {
            return null;
        }
        $t = trim($s);
        if ($t === '' || $t === '—') {
            return null;
        }
        $n = (float) str_replace(',', '', $t);
        if ($n < 0 || $n > 100) {
            return null;
        }

        return $n;
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function pickDiscountValue(array $json, int $n): ?string
    {
        $keys1 = $n === 1
            ? ['descuento1', 'Descuento1', 'decto1', 'Decto1', 'desc1']
            : ['descuento2', 'Descuento2', 'decto2', 'Decto2', 'desc2'];
        $nested = data_get($json, 'data');
        if (is_array($nested)) {
            foreach ($keys1 as $k) {
                if (array_key_exists($k, $nested)) {
                    return $this->scalarToDisplay($nested[$k]);
                }
            }
        }
        foreach ($keys1 as $k) {
            if (array_key_exists($k, $json)) {
                return $this->scalarToDisplay($json[$k]);
            }
        }

        return null;
    }

    private function scalarToDisplay(mixed $v): string
    {
        if ($v === null) {
            return '—';
        }
        if (is_bool($v)) {
            return $v ? 'Sí' : 'No';
        }
        if (is_float($v) || is_int($v)) {
            return (string) $v;
        }

        return (string) $v;
    }

    /**
     * Busca el primer valor no vacío entre keys candidatas. La API externa
     * suele envolver la respuesta en { data: {...} }.
     *
     * @param  array<string, mixed>  $json
     * @param  list<string>  $keys
     */
    private function pickNestedValue(array $json, array $keys): mixed
    {
        $nested = data_get($json, 'data');
        if (is_array($nested)) {
            foreach ($keys as $k) {
                if (array_key_exists($k, $nested) && $nested[$k] !== null && $nested[$k] !== '') {
                    return $nested[$k];
                }
            }
        }
        foreach ($keys as $k) {
            if (array_key_exists($k, $json) && $json[$k] !== null && $json[$k] !== '') {
                return $json[$k];
            }
        }

        return null;
    }
}
