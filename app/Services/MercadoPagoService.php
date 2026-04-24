<?php

namespace App\Services;

use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\Client\Payment\PaymentClient;
use MercadoPago\Exceptions\MPApiException;
use Illuminate\Support\Facades\Log;

class MercadoPagoService
{
    protected $client;
    protected $paymentClient;

    private const PREFERENCE_TITLE_MAX = 256;

    private const PREFERENCE_ITEM_DESCRIPTION_MAX = 256;

    private const PREFERENCE_ADDITIONAL_INFO_MAX = 600;

    private const PAYMENT_DESCRIPTION_MAX = 256;

    private const METADATA_VALUE_MAX = 220;

    private const METADATA_MAX_KEYS = 10;

    public function __construct()
    {
        try {
            // Configurar MercadoPago
            $accessToken = config('services.mercadopago.access_token');
            
            if (!$accessToken) {
                Log::error('MercadoPago access token no configurado');
                throw new \Exception('MercadoPago access token not configured');
            }

            Log::debug('Configurando MercadoPago SDK', [
                'environment' => config('services.mercadopago.environment', 'sandbox'),
                'has_access_token' => !empty($accessToken)
            ]);

            MercadoPagoConfig::setAccessToken($accessToken);
            
            // Determinar el ambiente según la configuración
            $environment = config('services.mercadopago.environment', 'sandbox');
            $runtimeEnvironment = $environment === 'production' 
                ? MercadoPagoConfig::PRODUCTION 
                : MercadoPagoConfig::LOCAL;
            
            // Intentar con ambos métodos por compatibilidad
            if (method_exists(MercadoPagoConfig::class, 'setRuntimeEnvironment')) {
                MercadoPagoConfig::setRuntimeEnvironment($runtimeEnvironment);
            } elseif (method_exists(MercadoPagoConfig::class, 'setRuntimeEnviroment')) {
                MercadoPagoConfig::setRuntimeEnviroment($runtimeEnvironment);
            }
            
            // No configurar timeout - dejar que el SDK use sus valores por defecto
            
            $this->client = new PreferenceClient();
            $this->paymentClient = new PaymentClient();
            
            Log::debug('MercadoPago SDK configurado correctamente');
            
        } catch (\Exception $e) {
            Log::error('Error configurando MercadoPago SDK', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Línea de pago con tarjeta (API Pagos, sin carrito de ítems en MP): resumen estilo e‑commerce.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    public function buildDirectPaymentDescription(
        \App\Models\User $user,
        array $items,
    ): string {
        $bits = ['Cherry Central'];
        $sc = trim((string) ($user->seller_category ?? ''));
        if ($sc !== '') {
            $bits[] = 'Vendedor: '.$sc;
        }
        $lineParts = [];
        foreach ($items as $it) {
            $lineParts[] = $this->oneLineItemSummary($it, false);
        }
        $lineParts = array_values(array_filter($lineParts, static fn ($s) => $s !== ''));
        $summary = implode(' | ', $lineParts);
        $base = implode(' — ', $bits);
        if ($summary !== '') {
            $base .= ' — '.$this->truncateUtf8String($summary, 180);
        }
        if (mb_strlen($base) > self::PAYMENT_DESCRIPTION_MAX) {
            $base = mb_substr($base, 0, self::PAYMENT_DESCRIPTION_MAX - 1).'…';
        }
        return $base;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<string, string>
     */
    public function buildDirectPaymentMetadata(\App\Models\User $user, array $items): array
    {
        $pids = [];
        foreach (array_slice($items, 0, 8) as $it) {
            $pids[] = (string) ($it['product_id'] ?? $it['id'] ?? '0');
        }
        $meta = array_filter(['app' => 'cherry', 'c_uid' => (string) $user->id, 'c_sc' => (string) ($user->seller_category ?? ''), 'c_n' => (string) count($items), 'c_skus' => implode(',', $pids)]);

        return $this->normalizeMetadataForApi($meta, self::METADATA_MAX_KEYS);
    }

    /**
     * Normaliza inputs de ítem (name/title, price, etc.) y envía título, descripción, picture_url, category_id.
     */
    public function lineItemToPreferenceRow(array $raw, ?string $appBaseUrl = null): array
    {
        $appBase = $appBaseUrl ?? rtrim((string) config('app.url', ''), '/');
        $n = $this->normalizeLineItem($raw);
        $title = $this->truncateUtf8String($n['name'] ?? 'Producto', self::PREFERENCE_TITLE_MAX);
        $desc = $this->lineDescriptionFromNormalizedItem($n);
        if ($desc !== '') {
            $desc = $this->truncateUtf8String($desc, self::PREFERENCE_ITEM_DESCRIPTION_MAX);
        }
        $row = [
            'id' => (string) ($n['product_id'] ?? '0'),
            'title' => $title,
            'quantity' => (int) ($n['quantity'] ?? 0),
            'unit_price' => (float) ($n['price'] ?? 0),
            'currency_id' => $this->getCurrencyId(),
        ];
        if ($desc !== '') {
            $row['description'] = $desc;
        }
        $pic = $this->absolutePictureUrl($n['image'] ?? $n['picture_url'] ?? null, $appBase);
        if ($pic !== null) {
            $row['picture_url'] = $pic;
        }
        if (! empty($n['category_id'])) {
            $row['category_id'] = $this->truncateUtf8String((string) $n['category_id'], 256);
        }
        return $row;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rawItems
     * @return array<int, array<string, mixed>>
     */
    public function preferenceItemsFromOrderLines(array $rawItems, ?string $appBaseUrl = null): array
    {
        $out = [];
        foreach ($rawItems as $it) {
            $out[] = $this->lineItemToPreferenceRow($it, $appBaseUrl);
        }
        return $out;
    }

    /**
     * Crear una preferencia de pago
     */
    public function createPreference(array $orderData)
    {
        $p = is_array($orderData['payer'] ?? null) ? $orderData['payer'] : [];
        $orderData['user'] = array_merge(
            [
                'first_name' => (string) ($p['name'] ?? ''),
                'last_name' => (string) ($p['surname'] ?? ''),
                'email' => (string) ($p['email'] ?? ''),
                'phone' => (string) (is_array($p['phone'] ?? null) ? ($p['phone']['number'] ?? '') : ($p['phone'] ?? '')),
            ],
            $orderData['user'] ?? []
        );
        if (($orderData['user']['email'] ?? '') === '' && $p && ! empty($p['email'] ?? null)) {
            $orderData['user']['email'] = (string) $p['email'];
        }

        try {
            Log::info('Iniciando creación de preferencia MercadoPago', [
                'external_reference' => $orderData['order_id'] ?? 'N/A',
                'items_count' => count($orderData['items'] ?? []),
            ]);

            $appBase = rtrim((string) config('app.url', ''), '/');
            $items = $this->preferenceItemsFromOrderLines($orderData['items'] ?? [], $appBase);
            if ($items === []) {
                $items = [];
            }
            $meta = $this->metadataFromOrderDataForPreference($orderData, $items);
            $addInfo = $this->additionalInfoFromOrderData($orderData, $items);

            Log::debug('Items procesados para preferencia', ['items' => $items, 'has_metadata' => $meta !== null]);

            $montoEnviadoMp = 0.0;
            foreach ($items as $row) {
                $montoEnviadoMp += (float) ($row['unit_price'] ?? 0) * (int) ($row['quantity'] ?? 0);
            }
            $montoEnviadoMp = round($montoEnviadoMp, 2);
            Log::info('Mercado Pago: monto enviado en ítems de la preferencia', [
                'monto_enviado_mercadopago' => $montoEnviadoMp,
                'external_reference' => $orderData['order_id'] ?? 'N/A',
                'lineas' => count($items),
            ]);

            $backUrlSuccess = $this->getValidUrl('/compra-exitosa');
            $backUrlFailure = $this->getValidUrl('/carrito-detalle');
            $backUrlPending = $this->getValidUrl('/carrito-detalle');
            
            $appUrl = config('app.url');
            $isLocalhost = $this->isLocalhost($appUrl);
            $hasNgrok = !empty(env('NGROK_URL'));
            
            $addr = $orderData['address'] ?? [];
            $streetName = trim((string) ($addr['street_address'] ?? ''));
            $noExt = trim((string) ($addr['street_number_ext'] ?? ''));
            $noInt = trim((string) ($addr['street_number_int'] ?? ''));
            if ($noInt !== '') {
                $streetName = trim($streetName.' Int. '.$noInt);
            }
            $streetNumber = $noExt;

            $preferenceData = [
                'items' => $items,
                'payer' => [
                    'name' => $orderData['user']['first_name'],
                    'surname' => $orderData['user']['last_name'] ?? '',
                    'email' => $orderData['user']['email'],
                    'phone' => [
                        'number' => $orderData['user']['phone'] ?? ''
                    ],
                    'address' => [
                        'street_name' => $streetName,
                        'street_number' => $streetNumber,
                        'zip_code' => $addr['postal_code'] ?? '',
                        'country' => 'MX' // Código ISO de México
                    ],
                    'identification' => [
                        'type' => 'DNI',
                        'number' => ''
                    ]
                ],
                'back_urls' => [
                    'success' => $backUrlSuccess,
                    'failure' => $backUrlFailure,
                    'pending' => $backUrlPending
                ],
                'auto_return' => 'approved',
                'external_reference' => $orderData['order_id'] ?? uniqid('order_'),
                'payment_methods' => [
                    'excluded_payment_types' => [],
                    'excluded_payment_methods' => [],
                    'installments' => 12
                ],
                'shipments' => ($orderData['delivery_type'] ?? 'envio') === 'retiro' ? null : [
                    'receiver_address' => [
                        'street_name' => $streetName,
                        'street_number' => $streetNumber,
                        'zip_code' => $addr['postal_code'] ?? '',
                        'city_name' => $addr['city'] ?? '',
                        'state_name' => $addr['state'] ?? '',
                        'country_name' => 'México',
                        'country_id' => 'MX' // Código ISO de México para habilitar OXXO
                    ]
                ],
                'statement_descriptor' => 'Cherry Central',
                'purpose' => 'wallet_purchase', // Reduce publicidad mostrando que es una compra directa
                'expires' => true,
                'expiration_date_from' => now()->toISOString(),
                'expiration_date_to' => now()->addHours(24)->toISOString()
            ];

            if (! empty($meta) && is_array($meta)) {
                $preferenceData['metadata'] = $meta;
            }
            if ($addInfo !== '') {
                $preferenceData['additional_info'] = $addInfo;
            }

            // Checkout Pro: permitir métodos offline (ticket/OXXO).
            // Si algún flujo inyecta exclusiones, nunca excluir "ticket".
            $excludedTypes = $preferenceData['payment_methods']['excluded_payment_types'] ?? [];
            $preferenceData['payment_methods']['excluded_payment_types'] = array_values(array_filter(
                $excludedTypes,
                fn ($type) => (($type['id'] ?? null) !== 'ticket')
            ));
            
            // Agregar notification_url solo si tenemos URL pública (real o ngrok)
            // Si es localhost sin ngrok, el webhook se deshabilita (se procesa al regresar)
            if (!$isLocalhost || $hasNgrok) {
                $notificationUrl = $this->getValidUrl('/api/mercadopago/webhook');
                $preferenceData['notification_url'] = $notificationUrl;
                Log::info('✅ Webhook habilitado', ['url' => $notificationUrl]);
            } else {
                Log::warning('⚠️ Webhook deshabilitado - desarrollo local sin ngrok. Los pagos se verificarán al regresar del redirect.');
            }

            Log::info('Llamando a MercadoPago API para crear preferencia', [
                'external_reference' => $preferenceData['external_reference'],
                'notification_url' => $notificationUrl ?? 'no configurado',
                'items_count' => count($preferenceData['items']),
                'has_back_urls' => isset($preferenceData['back_urls']),
                'app_url' => config('app.url'),
                'is_localhost' => $isLocalhost,
                'has_ngrok' => $hasNgrok
            ]);

            // Recrear el cliente antes de la llamada para asegurar configuración fresca
            $this->client = new PreferenceClient();
            
            // Configurar tiempo de inicio para medir duración
            $startTime = microtime(true);
            
            Log::debug('Iniciando llamada a MercadoPago API...');
            $preference = $this->client->create($preferenceData);
            
            $elapsedTime = microtime(true) - $startTime;
            
            Log::info('Preferencia creada exitosamente', [
                'preference_id' => $preference->id ?? 'N/A',
                'elapsed_time' => round($elapsedTime, 2) . 's'
            ]);

            return $preference;
            
        } catch (MPApiException $e) {
            $apiResponse = $e->getApiResponse();
            $errorDetails = [
                'status_code' => $apiResponse ? $apiResponse->getStatusCode() : 'unknown',
                'content' => $apiResponse ? $apiResponse->getContent() : 'no content',
                'message' => $e->getMessage(),
                'preference_data' => $preferenceData ?? null
            ];
            
            
            // Proporcionar más detalles en el mensaje de error
            $errorMessage = 'Error creating payment preference: ' . $e->getMessage();
            if ($apiResponse && $apiResponse->getContent()) {
                $content = $apiResponse->getContent();
                if (is_array($content) && isset($content['message'])) {
                    $errorMessage .= ' - ' . $content['message'];
                } elseif (is_string($content)) {
                    $errorMessage .= ' - ' . $content;
                }
            }
            
            throw new \Exception($errorMessage);
            
        } catch (\Exception $e) {
            Log::error('Error general al crear preferencia', [
                'error_class' => get_class($e),
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'preference_data_keys' => isset($preferenceData) ? array_keys($preferenceData) : []
            ]);
            
            // Verificar si es un error de timeout
            if (str_contains($e->getMessage(), 'timeout') || str_contains($e->getMessage(), 'Connection timed out')) {
                throw new \Exception('Error de conexión con Mercado Pago. Verifica tu conexión a internet y las credenciales configuradas. Error: ' . $e->getMessage());
            }
            
            throw new \Exception('Error processing payment: ' . $e->getMessage());
        }
    }

    /**
     * Obtener información de un pago
     */
    public function getPayment($paymentId)
    {
        try {
            $payment = $this->paymentClient->get($paymentId);
            return $payment;
        } catch (MPApiException $e) {
            throw new \Exception('Error getting payment information');
        }
    }

    /**
     * Procesar webhook de MercadoPago
     */
    public function processWebhook(array $data)
    {
        try {
            // Log del webhook recibido
            Log::info('Webhook recibido de MercadoPago (raw data)', [
                'webhook_data' => $data
            ]);

            if (isset($data['type']) && $data['type'] === 'payment') {
                $paymentId = $data['data']['id'];
                $payment = $this->getPayment($paymentId);
                
                // Log completo del pago obtenido de MercadoPago
                Log::info('Pago completo obtenido de MercadoPago', [
                    'payment_id' => $paymentId,
                    'payment_object' => $payment,
                    'payment_array' => (array) $payment,
                    'status' => $payment->status ?? null,
                    'external_reference' => $payment->external_reference ?? null,
                    'transaction_amount' => $payment->transaction_amount ?? null,
                    'currency_id' => $payment->currency_id ?? null,
                    'date_created' => $payment->date_created ?? null,
                    'date_approved' => $payment->date_approved ?? null,
                    'payment_method_id' => $payment->payment_method_id ?? null,
                    'payment_type_id' => $payment->payment_type_id ?? null,
                    'payer' => $payment->payer ?? null,
                    'status_detail' => $payment->status_detail ?? null,
                ]);

                return [
                    'payment_id' => $paymentId,
                    'status' => $payment->status,
                    'external_reference' => $payment->external_reference,
                    'payment_data' => $payment
                ];
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Error procesando webhook de MercadoPago', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Obtener la URL de pago sandbox para testing
     */
    public function getSandboxPaymentUrl($preferenceId)
    {
        // Agregar parámetros para reducir publicidad
        return "https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=" . $preferenceId . "&source_operation=checkout_pro";
    }

    /**
     * Obtener la URL de pago producción
     */
    public function getProductionPaymentUrl($preferenceId)
    {
        // Agregar parámetros para reducir publicidad
        // source_operation=checkout_pro reduce la visualización de publicidad
        return "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=" . $preferenceId . "&source_operation=checkout_pro";
    }

    /**
     * Obtener la URL de pago según el ambiente
     */
    public function getPaymentUrl($preferenceId)
    {
        $environment = config('services.mercadopago.environment', 'sandbox');
        
        return $environment === 'production' 
            ? $this->getProductionPaymentUrl($preferenceId)
            : $this->getSandboxPaymentUrl($preferenceId);
    }

    /**
     * Obtener la URL del webhook (público para verificación)
     */
    public function getWebhookUrl()
    {
        $appUrl = config('app.url');
        $isLocalhost = $this->isLocalhost($appUrl);
        
        // Si es localhost sin ngrok, webhook deshabilitado
        if ($isLocalhost && empty(env('NGROK_URL'))) {
            return null;
        }
        
        return $this->getValidUrl('/api/mercadopago/webhook');
    }

    /**
     * Verificar si una URL es localhost
     */
    private function isLocalhost($url)
    {
        return str_contains($url, 'localhost') || 
               str_contains($url, '127.0.0.1') || 
               str_contains($url, '::1');
    }

    /**
     * Obtener una URL válida para MercadoPago
     * PRIORIDAD: URL real (APP_URL) > ngrok > localhost
     */
    private function getValidUrl($path)
    {
        $appUrl = config('app.url');
        $ngrokUrl = env('NGROK_URL');
        $isLocalhost = $this->isLocalhost($appUrl);
        
        // PRIORIDAD 1: Si APP_URL es una URL real (no localhost), usarla SIEMPRE
        // Esto es para producción o servidores con dominio real
        if (!$isLocalhost && !empty($appUrl)) {
            $url = rtrim($appUrl, '/') . $path;
            Log::info('✅ Usando URL real (APP_URL)', ['url' => $url]);
            return $url;
        }
        
        // PRIORIDAD 2: Si hay ngrok configurado (desarrollo con túnel público)
        if (!empty($ngrokUrl)) {
            $url = rtrim($ngrokUrl, '/') . $path;
            Log::info('🔗 Usando URL de ngrok', ['url' => $url]);
            return $url;
        }
        
        // PRIORIDAD 3: Localhost sin ngrok (solo para back_urls, webhook deshabilitado)
        $url = rtrim($appUrl, '/') . $path;
        Log::warning('⚠️ Usando localhost - webhook no funcionará automáticamente', ['url' => $url]);
        return $url;
    }

    /**
     * Crear un pago directo (sin redirección)
     */
    public function createPayment(array $paymentData)
    {
        // ⚠️ SIN TRY-CATCH PARA VER ERRORES EXACTOS DE MERCADOPAGO
        $rawDesc = (string) ($paymentData['description'] ?? 'Compra en Cherry Central');
        $description = $this->truncateUtf8String($rawDesc, self::PAYMENT_DESCRIPTION_MAX);
        $paymentRequest = [
            'transaction_amount' => (float) $paymentData['transaction_amount'],
            'token' => $paymentData['token'], // Token de la tarjeta generado por MercadoPago JS
            'description' => $description,
            'installments' => (int) ($paymentData['installments'] ?? 1),
            'payment_method_id' => $paymentData['payment_method_id'],
            'payer' => [
                'email' => $paymentData['payer']['email'],
                'first_name' => $paymentData['payer']['first_name'] ?? '',
                'last_name' => $paymentData['payer']['last_name'] ?? '',
            ],
            'external_reference' => $paymentData['external_reference'] ?? uniqid('payment_'),
        ];
        if (! empty($paymentData['metadata']) && is_array($paymentData['metadata'])) {
            $paymentRequest['metadata'] = $this->normalizeMetadataForApi(
                $paymentData['metadata'],
                self::METADATA_MAX_KEYS
            );
        }

        // ⚠️ SIN TRY-CATCH - Esto permitirá ver el error exacto de MercadoPago
        $payment = $this->paymentClient->create($paymentRequest);
        

        return $payment;
    }

    /**
     * Obtener el currency_id correcto basado en las credenciales
     * OXXO solo está disponible en México con MXN
     */
    private function getCurrencyId()
    {
        // Siempre usar MXN para México (OXXO solo está disponible en México)
        // Si necesitas otro país, configúralo en MERCADOPAGO_CURRENCY_ID
        return config('services.mercadopago.currency_id', 'MXN');
    }

    private function truncateUtf8String(string $s, int $max): string
    {
        if (mb_strlen($s) <= $max) {
            return $s;
        }
        if ($max <= 1) {
            return '…';
        }
        return mb_substr($s, 0, $max - 1).'…';
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function normalizeLineItem(array $item): array
    {
        $name = $item['name'] ?? $item['title'] ?? 'Producto';

        return [
            'name' => (string) $name,
            'product_id' => (string) ($item['product_id'] ?? $item['id'] ?? '0'),
            'price' => (float) ($item['price'] ?? $item['unit_price'] ?? 0),
            'quantity' => (int) ($item['quantity'] ?? 0),
            'size' => $item['size'] ?? null,
            'color' => $item['color'] ?? null,
            'barcode' => $item['barcode'] ?? null,
            'detalle_id' => $item['detalle_id'] ?? null,
            'is_coming_soon' => filter_var($item['is_coming_soon'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'desc_promo' => (float) ($item['desc_promo'] ?? 0),
            'user_offer_applies' => filter_var($item['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'image' => $item['image'] ?? $item['imagen'] ?? null,
            'category_id' => $item['category_id'] ?? null,
            'picture_url' => $item['picture_url'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $i
     */
    private function lineDescriptionFromNormalizedItem(array $i): string
    {
        $nm = mb_strtolower((string) ($i['name'] ?? ''));
        if ((string) ($i['product_id'] ?? '') === '0') {
            if (str_contains($nm, 'ajuste') || str_contains($nm, 'diferenc')) {
                return 'Ajuste de monto del pedido';
            }
            return 'Entrega o envío (servicio de envío)';
        }
        $bits = [];
        if (! empty($i['size'])) {
            $bits[] = 'T: '.(string) $i['size'];
        }
        if (! empty($i['color'])) {
            $bits[] = 'C: '.(string) $i['color'];
        }
        if (! empty($i['barcode'])) {
            $bits[] = 'Cód. '.(string) $i['barcode'];
        }
        if (! empty($i['detalle_id'])) {
            $bits[] = 'IdRef '.(string) $i['detalle_id'];
        }
        if (($i['desc_promo'] ?? 0) > 0.0001) {
            $bits[] = 'En oferta catálogo';
        } elseif (filter_var($i['user_offer_applies'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            $bits[] = 'Oferta usuario';
        }
        if (! empty($i['is_coming_soon'])) {
            $bits[] = 'Anticipado';
        }

        return implode(' · ', $bits);
    }

    private function oneLineItemSummary(array $it, bool $isNormalized): string
    {
        $n = $isNormalized ? $it : $this->normalizeLineItem($it);
        $name = $this->truncateUtf8String($n['name'] ?? 'Producto', 64);
        $q = (int) ($n['quantity'] ?? 0);
        if ($q < 1) {
            $q = 1;
        }
        $d = $this->lineDescriptionFromNormalizedItem($n);
        if ($d !== '' && (string) $n['name'] !== 'Envío') {
            $d2 = $this->truncateUtf8String($d, 80);
            if ($d2 !== '') {
                return "{$name} x{$q} ({$d2})";
            }
        }

        return "{$name} x{$q}";
    }

    private function absolutePictureUrl(mixed $url, string $appBase): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }
        if (is_string($url) === false) {
            return null;
        }
        if (str_contains($url, 'placeholder') || str_contains($url, 'Rectangle 4922')) {
            return null;
        }
        if (str_starts_with($url, 'https://') || str_starts_with($url, 'http://')) {
            return $url;
        }
        if (str_starts_with($url, '//')) {
            return 'https:'.$url;
        }
        $p = (string) $url;
        if (trim($p) === '') {
            return null;
        }
        if ($p[0] !== '/') {
            $p = '/'.$p;
        }

        return rtrim($appBase, '/').$p;
    }

    /**
     * @param  array<int, array<string, mixed>>  $mpItems
     */
    private function metadataFromOrderDataForPreference(array $orderData, array $mpItems): array
    {
        $m = array_filter(
            [
                'app' => 'cherry',
            ],
            static fn ($v) => $v !== null && $v !== ''
        );
        if (isset($orderData['cherry_user_id'])) {
            $m['c_uid'] = (string) $orderData['cherry_user_id'];
        }
        if (isset($orderData['cherry_order_id'])) {
            $m['c_oid'] = (string) $orderData['cherry_order_id'];
        }
        if (isset($orderData['cherry_order_number'])) {
            $m['c_oref'] = (string) $orderData['cherry_order_number'];
        }
        if (isset($orderData['cherry_seller_category']) && (string) $orderData['cherry_seller_category'] !== '') {
            $m['c_scat'] = (string) $orderData['cherry_seller_category'];
        }
        if (isset($orderData['cherry_order_group_id']) && (string) $orderData['cherry_order_group_id'] !== '') {
            $m['c_group'] = (string) $orderData['cherry_order_group_id'];
        }
        if (isset($orderData['cherry_sibling_order_id']) && (string) $orderData['cherry_sibling_order_id'] !== '') {
            $m['c_sib'] = (string) $orderData['cherry_sibling_order_id'];
        }
        if (isset($orderData['cherry_is_split']) && (string) $orderData['cherry_is_split'] !== '') {
            $m['c_split'] = (string) $orderData['cherry_is_split'];
        }
        $m['c_nlines'] = (string) count($orderData['items'] ?? []);

        return $this->normalizeMetadataForApi($m, self::METADATA_MAX_KEYS);
    }

    /**
     * @param  array<int, array<string, mixed>>  $mpItems
     */
    private function additionalInfoFromOrderData(array $orderData, array $mpItems): string
    {
        $parts = ['Plataforma Cherry', 'Líneas: '.(string) count($orderData['items'] ?? [])];
        $u = (string) ($orderData['cherry_order_number'] ?? '');
        if ($u !== '') {
            $parts[] = 'Pedido '.$u;
        }
        $em = (string) ($orderData['user']['email'] ?? '');
        if ($em !== '') {
            $parts[] = $em;
        }
        $sc = (string) ($orderData['cherry_seller_category'] ?? '');
        if ($sc !== '') {
            $parts[] = 'Categoría vendedor: '.$sc;
        }
        $sib = (string) ($orderData['cherry_sibling_order_id'] ?? '');
        if ($sib !== '' && (string) ($orderData['cherry_is_split'] ?? '') === '1') {
            $parts[] = 'Pedido vinculado: '.$sib;
        }
        $titles = [];
        foreach (array_slice($mpItems, 0, 4) as $r) {
            if (! empty($r['title']) && (string) $r['title'] !== 'Envío') {
                $titles[] = (string) $r['title'].' x'.(string) ($r['quantity'] ?? 0);
            }
        }
        if (! empty($titles)) {
            $parts[] = implode(' · ', $titles);
        }

        $s = implode(' | ', $parts);
        if (mb_strlen($s) > self::PREFERENCE_ADDITIONAL_INFO_MAX) {
            return $this->truncateUtf8String($s, self::PREFERENCE_ADDITIONAL_INFO_MAX);
        }

        return $s;
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, string>
     */
    private function normalizeMetadataForApi(array $metadata, int $maxKeys = 10): array
    {
        $out = [];
        $i = 0;
        foreach ($metadata as $key => $v) {
            if ($i >= $maxKeys) {
                break;
            }
            if ($v === null) {
                continue;
            }
            $sk = (string) $key;
            if (mb_strlen($sk) > 32) {
                $sk = mb_substr($sk, 0, 32);
            }
            $sv = mb_substr(preg_replace('/\s+/', ' ', trim((string) $v)), 0, self::METADATA_VALUE_MAX);
            if ($sv === '') {
                continue;
            }
            $out[$sk] = $sv;
            $i++;
        }

        return $out;
    }

    /**
     * Crear un pago en efectivo (OXXO, 7-Eleven, etc.)
     */
    public function createCashPayment(array $paymentData)
    {
        try {
            $paymentRequest = [
                'transaction_amount' => (float) $paymentData['transaction_amount'],
                'description' => $paymentData['description'] ?? 'Compra en Cherry Central',
                'payment_method_id' => $paymentData['payment_method_id'] ?? 'oxxo', // oxxo, paycash, etc.
                'currency_id' => $this->getCurrencyId(), // Asegurar que use MXN para México
                'payer' => [
                    'email' => $paymentData['payer']['email'],
                    'first_name' => $paymentData['payer']['first_name'] ?? '',
                    'last_name' => $paymentData['payer']['last_name'] ?? '',
                ],
                'external_reference' => $paymentData['external_reference'] ?? uniqid('cash_payment_'),
                'notification_url' => $this->getValidUrl('/api/mercadopago/webhook'),
            ];

            Log::info('Creating cash payment request', ['request' => $paymentRequest]);

            $payment = $this->paymentClient->create($paymentRequest);

            Log::info('Cash payment created', [
                'payment_id' => $payment->id,
                'status' => $payment->status,
                'payment_method_id' => $payment->payment_method_id
            ]);

            return $payment;

        } catch (MPApiException $e) {
            $apiResponse = $e->getApiResponse();
            $errorDetails = [
                'status_code' => $apiResponse ? $apiResponse->getStatusCode() : 'unknown',
                'content' => $apiResponse ? $apiResponse->getContent() : 'no content',
                'message' => $e->getMessage()
            ];
            
            Log::error('Error creating cash payment', $errorDetails);
            
            $errorMessage = 'Error creating cash payment: ' . $e->getMessage();
            if ($apiResponse && $apiResponse->getContent()) {
                $content = $apiResponse->getContent();
                if (is_array($content) && isset($content['message'])) {
                    $errorMessage .= ' - ' . $content['message'];
                }
            }
            
            throw new \Exception($errorMessage);
            
        } catch (\Exception $e) {
            Log::error('Error processing cash payment', ['error' => $e->getMessage()]);
            throw new \Exception('Error processing cash payment: ' . $e->getMessage());
        }
    }

    /**
     * Obtener los métodos de pago en efectivo disponibles
     */
    public function getCashPaymentMethods()
    {
        // Métodos de pago en efectivo disponibles en México
        return [
            [
                'id' => 'oxxo',
                'name' => 'OXXO',
                'logo' => 'https://www.mercadopago.com/org-img/MP3/API/logos/oxxo.gif',
                'description' => 'Paga en cualquier tienda OXXO'
            ],
            [
                'id' => 'paycash',
                'name' => 'PayCash',
                'logo' => 'https://www.mercadopago.com/org-img/MP3/API/logos/paycash.gif',
                'description' => 'Paga en 7-Eleven, Farmacias del Ahorro, etc.'
            ]
        ];
    }
}

