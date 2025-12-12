<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Detalle;
use App\Models\Producto;
use App\Models\User;
use App\Models\ContactInfo;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalSalesService
{
    private const EXTERNAL_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/venta';

    /**
     * Enviar información de venta al endpoint externo
     * Lanza excepciones si hay errores para que se muestren completos
     */
    public function sendSaleToExternalApi(Order $order): void
    {
        $user = $order->user;
        $address = $order->address;
        
        // Obtener delivery_type desde payment_data o determinar por address
        $paymentData = $order->payment_data ?? [];
        $deliveryType = $paymentData['delivery_type'] ?? ($address ? 'envio' : 'retiro');
        
        // Si es retiro en tienda y no hay address, usar dirección de la tienda
        if ($deliveryType === 'retiro' && !$address) {
            $contactInfo = ContactInfo::getContactInfo();
            // Crear un objeto temporal con la dirección de la tienda
            $address = (object) [
                'street_address' => $contactInfo->address_street ?? '',
                'city' => $contactInfo->address_city ?? '',
                'state' => 'Ciudad de México',
                'postal_code' => '06080',
                'country' => 'México'
            ];
        }
        
        // Si aún no hay address, usar valores por defecto
        if (!$address) {
            $address = (object) [
                'street_address' => '',
                'city' => '',
                'state' => '',
                'postal_code' => '',
                'country' => 'México'
            ];
        }
        
        // Obtener número de pedido (usar el ID del pedido)
        $numeroPedido = $order->id;
        // Usar formato "PV" como en el ejemplo de la API externa
        $nombrePedido = 'PV' . str_pad($numeroPedido, 4, '0', STR_PAD_LEFT);
        
        // Preparar items con idArtd e idArticulo
        // IMPORTANTE: Por cada talla/color comprada se envía un item separado
        $items = [];
        $importeNeto = 0;
        $descuentos = 0;
        
        foreach ($order->items as $orderItem) {
            // Normalizar product_id agregando ceros a la izquierda (formato: 6 dígitos)
            // Ejemplo: 10000 -> "010000", "010000" -> "010000"
            $productIdNormalized = $this->normalizeProductId($orderItem->product_id);
            
            // Obtener el producto primero
            $producto = Producto::find($productIdNormalized);
            if (!$producto) {
                Log::warning('No se encontró producto para OrderItem', [
                    'order_item_id' => $orderItem->id,
                    'product_id_original' => $orderItem->product_id,
                    'product_id_normalized' => $productIdNormalized
                ]);
                continue;
            }
            
            // Buscar el detalle que coincida con el producto, tamaño y color
            // idArtd es el identificador del artículo por color y talla en el sistema
            $detalle = $this->findDetalleForOrderItem($orderItem);
            
            if (!$detalle) {
                Log::error('No se encontró detalle para OrderItem - CRÍTICO', [
                    'order_item_id' => $orderItem->id,
                    'product_id' => $orderItem->product_id,
                    'size' => $orderItem->size,
                    'color' => $orderItem->color
                ]);
                // Lanzar excepción porque idArtd es indispensable
                throw new \Exception(
                    "No se encontró detalle (idArtd) para el producto {$producto->id}, talla {$orderItem->size}, color {$orderItem->color}. " .
                    "Este campo es indispensable para enviar la venta a la API externa."
                );
            }
            
            // Precio que pagó el cliente (precio unitario después de descuentos)
            $precioUnitario = (float) $orderItem->price;
            $cantidad = (int) $orderItem->quantity;
            
            // Calcular descuento: comparar precio pagado con precio original del producto
            $precioOriginal = (float) ($producto->precio1 ?? 0);
            $descuentoUnitario = 0;
            $descuentoItem = 0;
            
            // Si hay precio original y es mayor al precio pagado, hay descuento
            if ($precioOriginal > 0 && $precioOriginal > $precioUnitario) {
                $descuentoUnitario = $precioOriginal - $precioUnitario;
                $descuentoItem = $descuentoUnitario * $cantidad;
            }
            
            // Calcular subtotal y acumular
            $subtotal = $precioUnitario * $cantidad;
            $importeNeto += $subtotal;
            $descuentos += $descuentoItem;
            
            // idArticulo: Identificador del artículo en el sistema (ejemplo: "PL09406", "CH09809")
            // Usar el ID normalizado del producto encontrado
            $idArticulo = (string) ($producto->id ?? $productIdNormalized);
            
            // Crear item para esta talla/color específica
            // Cada OrderItem representa una combinación única de producto/talla/color
            $items[] = [
                'idArtd' => (int) $detalle->id, // Identificador del artículo por color y talla
                'idArticulo' => $idArticulo, // Identificador del artículo
                'cantidad' => (float) $cantidad, // Cantidad de esta talla específica
                'precio' => (float) $precioUnitario, // Precio que pagó el cliente por unidad
                'descuento' => (float) $descuentoItem, // Descuento total aplicado (unitario * cantidad)
                'opcDecto' => $descuentoItem > 0 ? 'S' : 'N' // Indica si hay descuento
            ];
        }
        
        // Validar que haya items procesados
        if (empty($items)) {
            throw new \Exception(
                "No se pudieron procesar los items de la orden #{$order->id}. " .
                "El array de items está vacío. Verifica que los productos tengan detalles (idArtd) asociados."
            );
        }
        
        // Obtener información del pago de MercadoPago
        $mercadopagoPaymentId = $order->mercadopago_payment_id ?? null;
        
        // Preparar datos del cliente
        $clienteData = $this->prepareClienteData($user, $address, $deliveryType);
        
        // Calcular importes
        $costoEnvio = 0; // Por ahora 0, se puede calcular después
        $importeTotal = $importeNeto - $descuentos;
        $importeFinal = $importeTotal + $costoEnvio;
        
        // Validar que importeFinal sea válido
        if ($importeFinal <= 0) {
            Log::warning('Importe final es 0 o negativo', [
                'order_id' => $order->id,
                'importeNeto' => $importeNeto,
                'descuentos' => $descuentos,
                'importeTotal' => $importeTotal,
                'costoEnvio' => $costoEnvio,
                'importeFinal' => $importeFinal,
                'items_count' => count($items)
            ]);
        }
        
        // Preparar payload para la API externa
        // id_pedido debe ser un número grande único (usar timestamp + order_id)
        $idPedido = (int) ($order->created_at->timestamp . str_pad($order->id, 4, '0', STR_PAD_LEFT));
        
        $payload = [
            'id_pedido' => $idPedido,
            'numero_pedido' => (int) $numeroPedido,
            'nombre_pedido' => $nombrePedido,
            'fecha' => $order->created_at->format('Y-m-d\TH:i:s'),
            'pago' => [
                'external_reference' => (int) ($mercadopagoPaymentId ?? $idPedido),
                'fecha_pago' => $order->created_at->format('Y-m-d\TH:i:s'),
                'tipoPago' => 'MP' // MercadoPago
            ],
            'cliente' => $clienteData,
            'decto1' => 0.0,
            'impoDecto1' => 0.0,
            'refDecto1' => null,
            'decto2' => 0.0,
            'impoDecto2' => 0.0,
            'decto3' => 0.0,
            'impoDecto3' => 0.0,
            'importeNeto' => (float) $importeNeto,
            'descuentos' => (float) $descuentos,
            'importeTotal' => (float) $importeTotal,
            'costoEnvio' => (float) $costoEnvio,
            'items' => $items,
            'importeFinal' => (float) $importeFinal
        ];

        // Log detallado del payload antes de enviar
        Log::info('Payload para API externa', [
            'order_id' => $order->id,
            'items_count' => count($items),
            'importeNeto' => $importeNeto,
            'descuentos' => $descuentos,
            'importeTotal' => $importeTotal,
            'costoEnvio' => $costoEnvio,
            'importeFinal' => $importeFinal,
            'payload' => $payload
        ]);
        
        // Validar que items no esté vacío
        if (empty($payload['items'])) {
            throw new \Exception('El payload no contiene items. No se puede enviar una venta sin productos.');
        }
        
        // Validar que importeFinal esté definido y sea mayor a 0
        if (!isset($payload['importeFinal']) || $payload['importeFinal'] <= 0) {
            throw new \Exception(
                "El importeFinal no está definido o es inválido. " .
                "Valor actual: {$payload['importeFinal']}. " .
                "ImporteNeto: {$importeNeto}, Descuentos: {$descuentos}, CostoEnvio: {$costoEnvio}"
            );
        }
        
        // Verificar estructura final del payload antes de enviar
        if (!isset($payload['items']) || !is_array($payload['items'])) {
            throw new \Exception('El campo items no está definido o no es un array en el payload.');
        }
        
        if (!isset($payload['importeFinal'])) {
            throw new \Exception('El campo importeFinal no está definido en el payload.');
        }
        
        // Log del payload completo en formato JSON para verificar estructura
        Log::info('Payload JSON completo para API externa', [
            'order_id' => $order->id,
            'payload_json' => json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            'items_count' => count($payload['items']),
            'importeFinal' => $payload['importeFinal']
        ]);
        
        // Log del JSON exacto que se enviará
        $jsonEnviado = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        Log::info('JSON exacto enviado a API externa', [
            'url' => self::EXTERNAL_API_URL,
            'json' => $jsonEnviado,
            'payload_array' => $payload
        ]);
        
        // Enviar a la API externa (sin try-catch para ver el error completo)
        $response = Http::timeout(30)
            ->withoutVerifying()
            ->post(self::EXTERNAL_API_URL, $payload);
        
        if ($response->successful()) {
            Log::info('Venta enviada exitosamente a API externa', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'response' => $response->json()
            ]);
            return;
        } else {
            $errorBody = $response->body();
            $errorJson = $response->json();
            Log::error('Error al enviar venta a API externa', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'response_body' => $errorBody,
                'response_json' => $errorJson,
                'url' => self::EXTERNAL_API_URL,
                'payload_sent' => $payload
            ]);
            
            // Lanzar excepción con el mensaje original de la API externa y el payload enviado
            $errorMessage = $errorJson['error'] ?? $errorBody ?? 'Error desconocido';
            
            // Crear una excepción personalizada que incluya el payload
            $exception = new \Exception($errorMessage, $response->status());
            $exception->payload = $payload;
            $exception->response = [
                'status' => $response->status(),
                'body' => $errorBody,
                'json' => $errorJson
            ];
            
            throw $exception;
        }
    }
    
    /**
     * Normalizar product_id agregando ceros a la izquierda (formato: 6 dígitos)
     * Ejemplo: 10000 -> "010000", "010000" -> "010000", 123 -> "000123"
     */
    private function normalizeProductId($productId): string
    {
        // Convertir a string y eliminar espacios
        $productIdStr = trim((string) $productId);
        
        // Si ya tiene 6 o más caracteres, retornar tal cual
        if (strlen($productIdStr) >= 6) {
            return $productIdStr;
        }
        
        // Agregar ceros a la izquierda hasta tener 6 dígitos
        return str_pad($productIdStr, 6, '0', STR_PAD_LEFT);
    }
    
    /**
     * Buscar el detalle que coincida con el OrderItem
     */
    private function findDetalleForOrderItem(OrderItem $orderItem): ?Detalle
    {
        // Normalizar product_id antes de buscar
        $productIdNormalized = $this->normalizeProductId($orderItem->product_id);
        
        // Buscar detalle por producto_id, tamaño y color
        $detalle = Detalle::where('producto_id', $productIdNormalized)
            ->where('detalle', $orderItem->size)
            ->where('nombreColor', $orderItem->color)
            ->first();
        
        // Si no se encuentra con color exacto, buscar solo por producto y tamaño
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $productIdNormalized)
                ->where('detalle', $orderItem->size)
                ->first();
        }
        
        // Si aún no se encuentra, buscar solo por producto (cualquier detalle)
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $productIdNormalized)
                ->first();
        }
        
        return $detalle;
    }
    
    /**
     * Preparar datos del cliente según el formato requerido
     */
    private function prepareClienteData(User $user, $address, string $deliveryType = 'envio'): array
    {
        // Separar dirección en componentes
        $streetAddress = $address->street_address ?? '';
        $streetParts = $this->parseStreetAddress($streetAddress);
        
        // Si es retiro en tienda, agregar nota en el nombre
        $nombre = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
        if ($deliveryType === 'retiro') {
            $nombre .= ' (RETIRO EN TIENDA)';
        }
        
        // Estructura simplificada según la especificación de la API externa
        // Usar 'id' en lugar de 'id_cliente' con el número original del usuario
        return [
            'id' => (int) $user->id,
            'nombre' => $nombre,
            'rfc' => $user->rfc ?? 'XAXX010101000',
            'calle' => $streetParts['street'] ?? $streetAddress,
            'no_int' => $streetParts['no_int'] ?? null,
            'no_ext' => $streetParts['no_ext'] ?? null,
            'municipio' => $address->municipality ?? $address->city ?? '',
            'colonia' => null,
            'estado' => $address->state ?? '',
            'ciudad' => $this->normalizeCity($address->city ?? ''),
            'pais' => $address->country ?? 'México',
            'codpos' => $address->postal_code ?? '',
            'contacto1' => null,
            'telefono1' => $user->phone ?? null,
            'email1' => $user->email ?? null,
            'metodopago' => '99',
            'numctapago' => '0000',
            'opccredito' => 'N',
            'id_uso' => 'G01',
            'id_metpago' => 'PPD',
            'telefono' => $user->phone ?? null,
            'email' => $user->email ?? null
        ];
    }
    
    /**
     * Parsear dirección en componentes
     */
    private function parseStreetAddress(string $streetAddress): array
    {
        // Intentar extraer número exterior e interior
        // Formato común: "Calle Nombre 123 Int 4" o "Calle Nombre 123"
        preg_match('/(.+?)\s+(\d+)(?:\s+(?:Int|Interior|No\.?\s*Int\.?)\s+(\d+))?/i', $streetAddress, $matches);
        
        if (count($matches) >= 3) {
            return [
                'street' => trim($matches[1]),
                'no_ext' => $matches[2] ?? null,
                'no_int' => $matches[3] ?? null
            ];
        }
        
        return [
            'street' => $streetAddress,
            'no_ext' => null,
            'no_int' => null
        ];
    }
    
    /**
     * Normalizar nombre de ciudad según formato esperado por la API externa
     */
    private function normalizeCity(?string $city): string
    {
        if (empty($city)) {
            return '';
        }
        
        // Normalizar "Ciudad de México" a "CDMX"
        $normalized = trim($city);
        if (stripos($normalized, 'Ciudad de México') !== false || 
            stripos($normalized, 'CDMX') !== false ||
            stripos($normalized, 'Ciudad de Mexico') !== false) {
            return 'CDMX';
        }
        
        return $normalized;
    }
}
