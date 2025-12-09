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
     * Crear una preferencia de pago
     */
    public function createPreference(array $orderData)
    {
        try {
            Log::info('Iniciando creación de preferencia MercadoPago', [
                'external_reference' => $orderData['order_id'] ?? 'N/A',
                'items_count' => count($orderData['items'] ?? [])
            ]);

            $items = [];
            
            // Procesar items del pedido
            foreach ($orderData['items'] as $item) {
                $items[] = [
                    'id' => (string) $item['product_id'],
                    'title' => $item['name'],
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $item['price'],
                    'currency_id' => $this->getCurrencyId()
                ];
            }

            Log::debug('Items procesados para preferencia', ['items' => $items]);

            $backUrlSuccess = $this->getValidUrl('/compra-exitosa');
            $backUrlFailure = $this->getValidUrl('/carrito-detalle');
            $backUrlPending = $this->getValidUrl('/carrito-detalle');
            
            $appUrl = config('app.url');
            $isLocalhost = $this->isLocalhost($appUrl);
            $hasNgrok = !empty(env('NGROK_URL'));
            
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
                        'street_name' => $orderData['address']['street_address'] ?? '',
                        'street_number' => '',
                        'zip_code' => $orderData['address']['postal_code'] ?? '',
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
                        'street_name' => $orderData['address']['street_address'] ?? '',
                        'street_number' => '',
                        'zip_code' => $orderData['address']['postal_code'] ?? '',
                        'city_name' => $orderData['address']['city'] ?? '',
                        'state_name' => $orderData['address']['state'] ?? '',
                        'country_name' => 'México',
                        'country_id' => 'MX' // Código ISO de México para habilitar OXXO
                    ]
                ],
                'statement_descriptor' => 'Cherry Central',
                'expires' => true,
                'expiration_date_from' => now()->toISOString(),
                'expiration_date_to' => now()->addHours(24)->toISOString()
            ];
            
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

            if (isset($data['type']) && $data['type'] === 'payment') {
                $paymentId = $data['data']['id'];
                $payment = $this->getPayment($paymentId);
                

                return [
                    'payment_id' => $paymentId,
                    'status' => $payment->status,
                    'external_reference' => $payment->external_reference,
                    'payment_data' => $payment
                ];
            }

            return null;
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Obtener la URL de pago sandbox para testing
     */
    public function getSandboxPaymentUrl($preferenceId)
    {
        return "https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=" . $preferenceId;
    }

    /**
     * Obtener la URL de pago producción
     */
    public function getProductionPaymentUrl($preferenceId)
    {
        return "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=" . $preferenceId;
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
        $paymentRequest = [
            'transaction_amount' => (float) $paymentData['transaction_amount'],
            'token' => $paymentData['token'], // Token de la tarjeta generado por MercadoPago JS
            'description' => $paymentData['description'] ?? 'Compra en Cherry Central',
            'installments' => (int) ($paymentData['installments'] ?? 1),
            'payment_method_id' => $paymentData['payment_method_id'],
            'payer' => [
                'email' => $paymentData['payer']['email'],
                'first_name' => $paymentData['payer']['first_name'] ?? '',
                'last_name' => $paymentData['payer']['last_name'] ?? '',
            ],
            'external_reference' => $paymentData['external_reference'] ?? uniqid('payment_'),
        ];


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

