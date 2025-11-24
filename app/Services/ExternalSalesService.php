<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Detalle;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExternalSalesService
{
    private const EXTERNAL_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/menudeo';

    /**
     * Enviar información de venta al endpoint externo
     */
    public function sendSaleToExternalApi(Order $order): bool
    {
        try {
            $user = $order->user;
            $address = $order->address;
            
            // Obtener número de pedido (usar el ID del pedido)
            $numeroPedido = $order->id;
            $nombrePedido = 'SC' . str_pad($numeroPedido, 4, '0', STR_PAD_LEFT);
            
            // Preparar items con idArtd e idArticulo
            $items = [];
            $importeNeto = 0;
            $descuentos = 0;
            
            foreach ($order->items as $orderItem) {
                // Buscar el detalle que coincida con el producto, tamaño y color
                $detalle = $this->findDetalleForOrderItem($orderItem);
                
                if (!$detalle) {
                    Log::warning('No se encontró detalle para OrderItem', [
                        'order_item_id' => $orderItem->id,
                        'product_id' => $orderItem->product_id,
                        'size' => $orderItem->size,
                        'color' => $orderItem->color
                    ]);
                    continue;
                }
                
                // Obtener el producto
                $producto = Producto::find($orderItem->product_id);
                if (!$producto) {
                    Log::warning('No se encontró producto para OrderItem', [
                        'order_item_id' => $orderItem->id,
                        'product_id' => $orderItem->product_id
                    ]);
                    continue;
                }
                
                // Calcular importe neto y descuentos
                $precioUnitario = (float) $orderItem->price;
                $cantidad = (int) $orderItem->quantity;
                $subtotal = $precioUnitario * $cantidad;
                $descuentoItem = 0; // Calcular si hay descuento aplicado
                
                // Si el precio del item es menor al precio original, hay descuento
                if ($producto->precio1 && $producto->precio1 > $precioUnitario) {
                    $descuentoItem = ($producto->precio1 - $precioUnitario) * $cantidad;
                }
                
                $importeNeto += $subtotal;
                $descuentos += $descuentoItem;
                
                // Usar el id del producto como idArticulo (según el ejemplo: "PL09406", "CH09809")
                // El id del producto es el id_articulo de la API externa
                $idArticulo = (string) ($producto->id ?? $orderItem->product_id);
                
                $items[] = [
                    'idArtd' => (int) $detalle->id,
                    'idArticulo' => (string) $idArticulo,
                    'cantidad' => (float) $cantidad,
                    'precio' => (float) $precioUnitario,
                    'descuento' => (float) $descuentoItem,
                    'opcDecto' => $descuentoItem > 0 ? 'S' : 'N'
                ];
            }
            
            // Obtener información del pago de MercadoPago
            $paymentData = $order->payment_data ?? [];
            $mercadopagoPaymentId = $order->mercadopago_payment_id ?? null;
            
            // Preparar datos del cliente
            $clienteData = $this->prepareClienteData($user, $address);
            
            // Calcular importes
            $costoEnvio = 0; // Por ahora 0, se puede calcular después
            $importeTotal = $importeNeto - $descuentos;
            $importeFinal = $importeTotal + $costoEnvio;
            
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

            dd($payload);
            
            // Enviar a la API externa
            $response = Http::timeout(30)
                ->withoutVerifying()
                ->post(self::EXTERNAL_API_URL, $payload);
            
            if ($response->successful()) {
                Log::info('Venta enviada exitosamente a API externa', [
                    'order_id' => $order->id,
                    'response' => $response->json()
                ]);
                return true;
            } else {
                Log::error('Error al enviar venta a API externa', [
                    'order_id' => $order->id,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }
            
        } catch (\Exception $e) {
            Log::error('Excepción al enviar venta a API externa', [
                'order_id' => $order->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }
    
    /**
     * Buscar el detalle que coincida con el OrderItem
     */
    private function findDetalleForOrderItem(OrderItem $orderItem): ?Detalle
    {
        // Buscar detalle por producto_id, tamaño y color
        $detalle = Detalle::where('producto_id', $orderItem->product_id)
            ->where('detalle', $orderItem->size)
            ->where('nombreColor', $orderItem->color)
            ->first();
        
        // Si no se encuentra con color exacto, buscar solo por producto y tamaño
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $orderItem->product_id)
                ->where('detalle', $orderItem->size)
                ->first();
        }
        
        // Si aún no se encuentra, buscar solo por producto (cualquier detalle)
        if (!$detalle) {
            $detalle = Detalle::where('producto_id', $orderItem->product_id)
                ->first();
        }
        
        return $detalle;
    }
    
    /**
     * Preparar datos del cliente según el formato requerido
     */
    private function prepareClienteData(User $user, $address): array
    {
        // Separar dirección en componentes
        $streetParts = $this->parseStreetAddress($address->street_address ?? '');
        
        return [
            'id_cliente' => (string) $user->id,
            'id_vendedor' => '0000',
            'nombre' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
            'rfc' => $user->rfc ?? 'XAXX010101000',
            'calle' => $streetParts['street'] ?? ($address->street_address ?? ''),
            'no_int' => $streetParts['no_int'] ?? null,
            'no_ext' => $streetParts['no_ext'] ?? null,
            'municipio' => $address->city ?? '',
            'colonia' => null,
            'estado' => $address->state ?? '',
            'ciudad' => $address->city ?? '',
            'pais' => $address->country ?? 'México',
            'codpos' => $address->postal_code ?? '',
            'precio' => 1,
            'limitecredit' => 0.0,
            'plazo_credito' => 0,
            'contacto1' => null,
            'telefono1' => $user->phone ?? null,
            'email1' => $user->email ?? null,
            'contacto2' => null,
            'telefono2' => null,
            'email2' => null,
            'contacto3' => null,
            'telefono3' => null,
            'email3' => null,
            'cont_cred' => null,
            'fecha_alta' => $user->created_at ? $user->created_at->timestamp * 1000 : time() * 1000,
            'serial' => 0,
            'gln' => null,
            'noproveedor' => null,
            'ctel' => null,
            'eancte' => null,
            'descuento1' => 0.0,
            'descuento2' => 0.0,
            'descuento3' => 0.0,
            'transporte' => null,
            'ctelev' => 'web',
            'tkmov' => 'K',
            'id_plantilla' => 0,
            'saldof' => 0.0,
            'autof' => 'S',
            'ext_limite' => 0.0,
            'tipoc' => 'L',
            'curp' => null,
            'desco' => 0.0,
            'porfac' => 0.0,
            'st_credito' => 1,
            'cie' => null,
            'id_empresa' => -1,
            'id_gpo' => null,
            'metodopago' => '99',
            'numctapago' => '0000',
            'decto1' => 0.0,
            'id_sector' => null,
            'status' => null,
            'id_tipo_cte' => null,
            'descuento' => 0.0,
            'desc_volumen' => 0.0,
            'id_comprador' => '00',
            'notas' => null,
            'pag_web' => null,
            'opccredito' => 'N',
            'id_uso' => 'G01',
            'id_metpago' => 'PPD',
            'nombre_comercial' => null,
            'id_asesor' => '0000',
            'zonaId' => 1,
            'fecha_uventa' => $user->created_at ? $user->created_at->timestamp * 1000 : time() * 1000,
            'id' => (string) $user->id,
            'telefono' => $user->phone ?? null,
            'email' => $user->email ?? null,
            'clienteSucursal' => [],
            'clientesDoctos' => []
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
}

