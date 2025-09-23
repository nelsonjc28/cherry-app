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
        // Configurar MercadoPago
        $accessToken = config('services.mercadopago.access_token');
        
        if (!$accessToken) {
            throw new \Exception('MercadoPago access token not configured');
        }

        MercadoPagoConfig::setAccessToken($accessToken);
        MercadoPagoConfig::setRuntimeEnviroment(MercadoPagoConfig::LOCAL);
        
        $this->client = new PreferenceClient();
        $this->paymentClient = new PaymentClient();
    }

    /**
     * Crear una preferencia de pago
     */
    public function createPreference(array $orderData)
    {
        try {
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
                        'zip_code' => $orderData['address']['postal_code'] ?? ''
                    ]
                ],
                'back_urls' => [
                    'success' => $this->getValidUrl('/compra-exitosa'),
                    'failure' => $this->getValidUrl('/checkout/failure'),
                    'pending' => $this->getValidUrl('/checkout/pending')
                ],
                'auto_return' => 'approved',
                'notification_url' => $this->getValidUrl('/api/mercadopago/webhook'),
                'external_reference' => $orderData['order_id'] ?? uniqid('order_'),
                'payment_methods' => [
                    'excluded_payment_types' => [],
                    'excluded_payment_methods' => [],
                    'installments' => 12
                ],
                'shipments' => [
                    'receiver_address' => [
                        'street_name' => $orderData['address']['street_address'] ?? '',
                        'street_number' => '',
                        'zip_code' => $orderData['address']['postal_code'] ?? '',
                        'city_name' => $orderData['address']['city'] ?? '',
                        'state_name' => $orderData['address']['state'] ?? '',
                        'country_name' => $orderData['address']['country'] ?? 'México'
                    ]
                ],
                'statement_descriptor' => 'Cherry Central',
                'expires' => true,
                'expiration_date_from' => now()->toISOString(),
                'expiration_date_to' => now()->addHours(24)->toISOString()
            ];


            $preference = $this->client->create($preferenceData);
            

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
     * Obtener una URL válida para MercadoPago
     * En desarrollo, usar ngrok o una URL pública válida
     */
    private function getValidUrl($path)
    {
        // Prioridad: Variable de entorno > APP_URL > URL por defecto
        $ngrokUrl = env('NGROK_URL');
        $appUrl = config('app.url');
        
        // Si hay URL de ngrok configurada, usarla
        if ($ngrokUrl) {
            return rtrim($ngrokUrl, '/') . $path;
        }
        
        // Si estamos en localhost, usar una URL de desarrollo válida
        if (str_contains($appUrl, 'localhost') || str_contains($appUrl, '127.0.0.1')) {
            // Para desarrollo, usar una URL temporal válida
            // IMPORTANTE: Actualiza esta URL con tu URL real de ngrok
            $developmentUrl = 'https://cherry-app-dev.ngrok.io';
            
            
            return $developmentUrl . $path;
        }
        
        return $appUrl . $path;
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
     */
    private function getCurrencyId()
    {
        $accessToken = config('services.mercadopago.access_token');
        
        // Determinar el país basado en el access token o configuración
        // Las credenciales de prueba suelen indicar el país
        if (str_contains($accessToken, 'TEST-')) {
            // Para cuentas de prueba, intentar detectar el país
            // Si no se puede detectar, usar ARS como default para cuentas de prueba
            return 'ARS'; // Argentina (peso argentino)
        }
        
        // Para producción, usar la configuración o default
        return config('services.mercadopago.currency_id', 'MXN');
    }
}

