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
        if (is_string($paymentData)) {
            $paymentData = json_decode($paymentData, true) ?? [];
        }
        if (! is_array($paymentData)) {
            $paymentData = [];
        }
        $deliveryType = $paymentData['delivery_type'] ?? ($address ? 'envio' : 'retiro');
        
        // Normalizar método de envío para la API externa
        // 'envio' = Envío a domicilio, 'retiro' = Retiro en tienda
        $metodoEnvio = $deliveryType === 'retiro' ? 'RETIRO EN TIENDA' : 'ENVIO A DOMICILIO';
        
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
        // Usar formato "CD" para pedidos normales, "PD" para pedidos anticipados
        $prefijo = ($order->is_advance_order ?? false) ? 'PD' : 'CD';
        $nombrePedido = $prefijo . str_pad($numeroPedido, 4, '0', STR_PAD_LEFT);
        
        // Preparar items con idArtd e idArticulo
        // IMPORTANTE: Por cada talla/color comprada se envía un item separado
        $items = [];
        /** @var float Suma de precio catálogo (precio1) × cantidad — base para descuentos */
        $importeBrutoCatalogo = 0.0;
        /** @var float Suma de subtotales reales de línea (neto pagado por mercancía) */
        $sumaNetoLineas = 0.0;

        foreach ($order->items as $orderItem) {
            if ($this->isNonInventoryOrderLine($orderItem)) {
                continue;
            }

            // Normalizar product_id agregando ceros a la izquierda (formato: 6 dígitos)
            // Ejemplo: 10000 -> "010000", "010000" -> "010000"
            $productIdNormalized = $this->normalizeProductId($orderItem->product_id);
            
            // Intentar múltiples formas de buscar el producto (similar a AdminOrderController)
            // 1. Intentar con ID normalizado (6 dígitos con ceros)
            $producto = Producto::find($productIdNormalized);
            
            // 2. Intentar con el ID original tal cual
            if (!$producto) {
                $producto = Producto::find((string) $orderItem->product_id);
            }
            
            // 3. Intentar con un cero al inicio (caso común: 232012306 -> 0232012306)
            if (!$producto) {
                $productIdWithZero = '0' . (string) $orderItem->product_id;
                $producto = Producto::find($productIdWithZero);
            }
            
            // 4. Intentar con padding a 6 dígitos (para IDs cortos)
            if (!$producto && strlen((string) $orderItem->product_id) < 6) {
                $productIdPadded = str_pad((string) $orderItem->product_id, 6, '0', STR_PAD_LEFT);
                $producto = Producto::find($productIdPadded);
            }
            
            // 5. Intentar con padding a 10 dígitos (para IDs largos como 232012306 -> 0232012306)
            if (!$producto && strlen((string) $orderItem->product_id) >= 6) {
                $productIdPadded10 = str_pad((string) $orderItem->product_id, 10, '0', STR_PAD_LEFT);
                $producto = Producto::find($productIdPadded10);
            }
            
            // 6. Buscar con LIKE (para IDs que contengan el product_id al final)
            if (!$producto) {
                $producto = Producto::where('id', 'LIKE', '%' . $orderItem->product_id)->first();
            }
            
            // 7. Buscar con LIKE inverso (para IDs que contengan el product_id al inicio)
            if (!$producto) {
                $producto = Producto::where('id', 'LIKE', $orderItem->product_id . '%')->first();
            }
            
            if (!$producto) {
                Log::error('No se encontró producto para OrderItem después de múltiples intentos', [
                    'order_item_id' => $orderItem->id,
                    'product_id_original' => $orderItem->product_id,
                    'product_id_normalized' => $productIdNormalized,
                    'order_id' => $order->id
                ]);
                // En lugar de hacer continue, lanzar excepción para que se sepa qué producto falta
                throw new \Exception(
                    "No se encontró el producto con ID '{$orderItem->product_id}' en la base de datos. " .
                    "OrderItem ID: {$orderItem->id}, Orden ID: {$order->id}. " .
                    "Verifica que el producto exista en la tabla productos."
                );
            }
            
            // Preferir detalle_id persistido en la línea; si no, buscar por producto/talla/color
            $detalle = null;
            if (! empty($orderItem->detalle_id)) {
                $detalle = Detalle::find($orderItem->detalle_id);
            }
            if (! $detalle) {
                $detalle = $this->findDetalleForOrderItem($orderItem, $producto->id);
            }
            
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
            
            // Precio original del producto (precio1) - SIN ningún descuento aplicado
            $precioOriginal = (float) ($producto->precio1 ?? 0);
            
            // Si no hay precio original, intentar con precio2, precio3, etc.
            if ($precioOriginal <= 0) {
                $precioOriginal = (float) ($producto->precio2 ?? $producto->precio3 ?? $producto->precio4 ?? 0);
            }
            
            // Neto real de la línea (precio unitario final × cantidad): incluye desc. por producto + escalas $7k / $15k
            $precioConDescuento = (float) $orderItem->price;
            $cantidad = (int) $orderItem->quantity;
            $netLine = round((float) $orderItem->subtotal, 2);
            $sumaNetoLineas += $netLine;

            // Si no hay precio original, usar el precio pagado como precio original (sin descuento)
            if ($precioOriginal <= 0) {
                $precioOriginal = $precioConDescuento;
            }

            $grossLine = round($precioOriginal * $cantidad, 2);
            $importeBrutoCatalogo += $grossLine;

            // % de descuento sobre precio catálogo para que (precio × (1 - %/100) × cantidad) refleje el neto de línea
            $porcentajeDescuento = 0.0;
            if ($grossLine > 0.0001) {
                $porcentajeDescuento = (($grossLine - $netLine) / $grossLine) * 100;
                if ($porcentajeDescuento < 0) {
                    $porcentajeDescuento = 0.0;
                }
                if ($porcentajeDescuento > 100) {
                    $porcentajeDescuento = 100.0;
                }
            }
            $porcentajeDescuento = round($porcentajeDescuento, 6);

            // idArticulo: Identificador del artículo en el sistema (ejemplo: "PL09406", "CH09809", "01000")
            // Usar el ID del producto tal cual está en la base de datos (sin normalización)
            // Esto preserva los ceros a la izquierda (ej: "01000" se envía como "01000", no como "010000")
            $idArticulo = (string) $producto->id;
            
            // Crear item para esta talla/color específica
            // Cada OrderItem representa una combinación única de producto/talla/color
            // Estructura según API externa: idArtd, idArticulo, cantidad, precio, descuento, opcDecto
            // IMPORTANTE: Enviar precio ORIGINAL (precio1) en el campo 'precio', NO el precio con descuento
            $items[] = [
                'idArtd' => (int) $detalle->id,
                'idArticulo' => (string) $idArticulo,
                'cantidad' => (int) $cantidad,
                'precio' => (float) $precioOriginal,
                'descuento' => (float) $porcentajeDescuento,
                'opcDecto' => $porcentajeDescuento > 0.00001 ? 'S' : 'N',
                'talla' => (string) ($detalle->detalle ?? ''),
                'nombreColor' => (string) ($detalle->nombreColor ?? ''),
            ];
        }
        
        // Validar que haya items procesados
        if (empty($items)) {
            $itemsInfo = [];
            foreach ($order->items as $item) {
                $itemsInfo[] = [
                    'order_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'name' => $item->name,
                    'size' => $item->size,
                    'color' => $item->color
                ];
            }
            
            Log::error('No se pudieron procesar items de la orden', [
                'order_id' => $order->id,
                'items_info' => $itemsInfo,
                'total_items' => $order->items->count()
            ]);
            
            throw new \Exception(
                "No se pudieron procesar los items de la orden #{$order->id}. " .
                "El array de items está vacío después de procesar " . $order->items->count() . " item(s). " .
                "Verifica que los productos existan en la base de datos y tengan detalles (idArtd) asociados. " .
                "Items de la orden: " . json_encode($itemsInfo)
            );
        }
        
        // Obtener información del pago de MercadoPago
        $mercadopagoPaymentId = $order->mercadopago_payment_id ?? null;
        
        // Preparar datos del cliente
        $clienteData = $this->prepareClienteData($user, $address, $deliveryType);
        
        // Leer descuentos de la orden (almacenados cuando se creó la orden)
        // Estos valores se calculan en el frontend y se guardan en la BD
        $descuento1 = (float) ($order->descuento1 ?? 0); // 30 u 33 (primer tramo volumen) si aplica; 0 si no
        $descuento2 = (float) ($order->descuento2 ?? 0); // 10% adicional cuando total elegible >= 15000
        
        // Log para verificar descuentos leídos de la BD
        Log::info('Descuentos leídos de la orden', [
            'order_id' => $order->id,
            'descuento1' => $descuento1,
            'descuento2' => $descuento2
        ]);
        
        // Obtener costo de envío desde el campo dedicado o desde payment_data (fallback para órdenes antiguas)
        $costoEnvio = 0;
        if ($order->shipping_amount !== null) {
            $costoEnvio = (float) $order->shipping_amount;
        } elseif (isset($paymentData['shipping_amount'])) {
            $costoEnvio = (float) $paymentData['shipping_amount'];
        }
        
        // Si es retiro en tienda, el costo de envío siempre es 0
        if ($deliveryType === 'retiro') {
            $costoEnvio = 0;
        }

        // --- Totales API (requisito cliente) ---
        // importeNeto = mercancía CON descuentos (lo cobrado en productos, sin envío).
        // importeTotal = mercancía SIN descuentos (bruto antes de aplicar descuentos).
        // subtotal BD = carrito antes de escalas $7k/$15k; discounted_total = tras descuentos (sin envío).
        $subtotalOrden = round((float) ($order->subtotal ?? 0), 2);
        $discountedTotalOrden = round((float) ($order->discounted_total ?? 0), 2);
        if ($discountedTotalOrden <= 0.01 && $sumaNetoLineas > 0.01) {
            $discountedTotalOrden = round($sumaNetoLineas, 2);
        }

        $importeNeto = $discountedTotalOrden;

        // Bruto sin descuentos: prioridad subtotal de orden; si viene igual al neto (error u orden vieja), catálogo o reconstrucción
        $importeBrutoCatalogo = round($importeBrutoCatalogo, 2);
        $importeTotal = $subtotalOrden;
        if ($importeTotal < $importeNeto - 0.01) {
            $importeTotal = round(max($importeBrutoCatalogo, $importeNeto), 2);
        }
        if ($importeTotal <= $importeNeto + 0.01) {
            $candidatoCatalogo = round(max($importeBrutoCatalogo, $importeNeto), 2);
            $deltaVolumen = round(max(0.0, $subtotalOrden - $discountedTotalOrden), 2);
            $importeTotal = round(max($candidatoCatalogo, $importeNeto + $deltaVolumen), 2);
        }
        $importeTotal = round(max($importeTotal, $importeNeto), 2);

        // Descuento monetario total de mercancía: bruto − neto (cuadra con importeTotal / importeNeto)
        $descuentos = round(max(0.0, $importeTotal - $importeNeto), 2);

        // Descuento por escalas según columnas de la orden (referencia; también en impoDecto1)
        $descuentoVolumenMonto = round(max(0.0, $subtotalOrden - $discountedTotalOrden), 2);

        $importeFinal = (float) ($order->total_amount ?? ($discountedTotalOrden + $costoEnvio));
        
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

        $tipoPago = 'MP';
        $pm = strtolower((string) ($order->payment_method ?? ''));
        if (str_contains($pm, 'credito') && ! str_contains($pm, 'mercadopago')) {
            $tipoPago = 'CREDITO';
        }

        $payload = [
            'id_pedido' => $idPedido,
            'numero_pedido' => (int) $numeroPedido,
            'nombre_pedido' => $nombrePedido,
            'fecha' => $order->created_at->format('Y-m-d\TH:i:s'),
            'pago' => [
                'external_reference' => (int) ($mercadopagoPaymentId ?? $idPedido),
                'fecha_pago' => $order->created_at->format('Y-m-d\TH:i:s'),
                'tipoPago' => $tipoPago,
            ],
            'cliente' => $clienteData,
            'metodoEnvio' => $metodoEnvio,
            'decto1' => 0.0,
            'impoDecto1' => (float) $descuentoVolumenMonto,
            'refDecto1' => null,
            'decto2' => 0.0,
            'impoDecto2' => 0.0,
            'decto3' => 0.0,
            'impoDecto3' => 0.0,
            'descuento1' => (float) $descuento1,
            'descuento2' => (float) $descuento2,
            'importeNeto' => (float) $importeNeto,
            'descuentos' => (float) $descuentos,
            'importeTotal' => (float) $importeTotal,
            'costoEnvio' => (float) $costoEnvio,
            'items' => $items,
            'importeFinal' => (float) $importeFinal,
        ];

        $splitGroupId = $paymentData['split_group_id'] ?? null;
        if (! empty($splitGroupId)) {
            $payload['operacionVinculada'] = [
                'split_group_id' => (string) $splitGroupId,
                'split_role' => $paymentData['split_role'] ?? null,
                'paired_order_id' => $paymentData['split_paired_order_id'] ?? null,
                'nota' => 'Operación fraccionada (crédito / Mercado Pago). Sumar importeNeto de órdenes con el mismo split_group_id para el total de mercancía del carrito.',
            ];
        }

        // Log detallado del payload antes de enviar
        Log::info('Payload para API externa', [
            'order_id' => $order->id,
            'items_count' => count($items),
            'subtotal_from_db' => $order->subtotal,
            'discounted_total_from_db' => $order->discounted_total,
            'total_amount_from_db' => $order->total_amount,
            'importe_bruto_catalogo' => $importeBrutoCatalogo,
            'importeNeto' => $importeNeto, // Con descuento (neto cobrado mercancía)
            'descuento_volumen_monto' => $descuentoVolumenMonto,
            'suma_neto_lineas' => $sumaNetoLineas,
            'descuentos' => $descuentos,
            'importeTotal' => $importeTotal, // Sin descuento (bruto lista)
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
     * Líneas que no son inventariables (envío, ajustes MP) — no se envían a la API de artículos.
     */
    private function isNonInventoryOrderLine(OrderItem $orderItem): bool
    {
        $pid = trim((string) ($orderItem->product_id ?? ''));
        if ($pid === '0' || $pid === '') {
            return true;
        }
        $name = strtolower(trim((string) ($orderItem->name ?? '')));

        return str_contains($name, 'envío')
            || str_contains($name, 'envio')
            || str_contains($name, 'ajuste de total')
            || str_contains($name, 'saldo pendiente');
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
     * @param OrderItem $orderItem El item de la orden
     * @param string|null $productIdFound El ID del producto encontrado (si se pasó, usar este en lugar de normalizar)
     */
    private function findDetalleForOrderItem(OrderItem $orderItem, ?string $productIdFound = null): ?Detalle
    {
        // Usar el ID del producto encontrado si se proporciona, de lo contrario normalizar
        $productIdToSearch = $productIdFound ?? $this->normalizeProductId($orderItem->product_id);
        
        // Buscar detalle por producto_id, tamaño y color
        $detalle = Detalle::where('producto_id', $productIdToSearch)
            ->where('detalle', $orderItem->size)
            ->where('nombreColor', $orderItem->color)
            ->first();
        
        // Si no se encuentra con color exacto, buscar solo por producto y tamaño
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $productIdToSearch)
                ->where('detalle', $orderItem->size)
                ->first();
        }
        
        // Si aún no se encuentra, buscar solo por producto (cualquier detalle)
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $productIdToSearch)
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
        
        // Nombre del cliente sin concatenar método de envío (ya va en campo separado)
        $nombre = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
        
        // Estructura simplificada según la especificación de la API externa
        // Formato del id: "DM" + 5 dígitos con ceros a la izquierda (ej: DM00002, DM00123)
        $idFormatted = 'DM' . str_pad((string) $user->id, 5, '0', STR_PAD_LEFT);
        
        return [
            'id' => $idFormatted,
            'nombre' => $nombre,
            'rfc' => $user->rfc ?? 'XAXX010101000',
            'calle' => $streetParts['street'] ?? $streetAddress,
            'no_int' => $streetParts['no_int'] ?? null,
            'no_ext' => $streetParts['no_ext'] ?? null,
            'municipio' => $address->municipality ?? $address->city ?? '',
            'colonia' => $address->colonia ?? null,
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
