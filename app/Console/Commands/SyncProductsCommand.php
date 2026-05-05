<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Genero;
use App\Models\Sector;
use App\Models\Producto;
use App\Models\Detalle;
use App\Models\Historial;
use App\Models\ProductNotification;
use App\Mail\ProductAvailableEmail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SyncProductsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincronizar productos desde la API externa';

    private const EXTERNAL_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/articulos';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        Log::info('🔄 Comando products:sync iniciado - Iniciando sincronización de productos...');
        $this->info('Iniciando sincronización de productos...');
        
        try {
            DB::beginTransaction();

            // Obtener productos de la API externa
            $this->info('Conectando con la API externa...');
            $response = Http::timeout(600)
                ->withoutVerifying()
                ->withOptions([
                    'verify' => false,
                    'curl' => [
                        CURLOPT_SSL_VERIFYPEER => false,
                        CURLOPT_SSL_VERIFYHOST => false,
                        CURLOPT_TIMEOUT => 600, // 10 minutos
                    ]
                ])
                ->get(self::EXTERNAL_API_URL);

            if (!$response->successful()) {
                throw new \Exception('Error al conectar con la API externa: ' . $response->status());
            }

            $responseData = $response->json();

            // Verificar si los productos están dentro de una clave 'data'
            if (isset($responseData['data']) && is_array($responseData['data'])) {
                $externalProducts = $responseData['data'];
                $this->info('Productos encontrados dentro de la clave "data"');
            } elseif (is_array($responseData)) {
                $externalProducts = $responseData;
                $this->info('Productos en el nivel raíz de la respuesta');
            } else {
                throw new \Exception('La respuesta de la API no es un array válido');
            }

            // Filtrar elementos que no son productos válidos (deben ser arrays con id_articulo)
            $originalCount = count($externalProducts);
            $externalProducts = array_filter($externalProducts, function($product) {
                // Solo filtrar si NO es un array o si NO tiene id_articulo definido
                if (!is_array($product)) {
                    return false;
                }
                // Verificar que tenga id_articulo y que no sea null
                return isset($product['id_articulo']) && $product['id_articulo'] !== null;
            });

            // Reindexar el array después de filtrar
            $externalProducts = array_values($externalProducts);
            $filteredCount = count($externalProducts);

            $this->info("Productos filtrados: {$originalCount} originales -> {$filteredCount} válidos");

            $stats = [
                'generos_creados' => 0,
                'sectores_creados' => 0,
                'productos_creados' => 0,
                'productos_actualizados' => 0,
                'detalles_creados' => 0,
                'detalles_actualizados' => 0,
                'total_productos' => count($externalProducts)
            ];

            $bar = $this->output->createProgressBar(count($externalProducts));
            $bar->start();

            // Procesar cada producto
            foreach ($externalProducts as $externalProduct) {
                try {
                    // 1. Sincronizar género
                    $generoId = null;
                    if (isset($externalProduct['genero']) && isset($externalProduct['genero']['descripcion'])) {
                        $genero = Genero::firstOrCreate(
                            ['descripcion' => $externalProduct['genero']['descripcion']]
                        );
                        $generoId = $genero->id;
                        if ($genero->wasRecentlyCreated) {
                            $stats['generos_creados']++;
                        }
                    } elseif (isset($externalProduct['generoId'])) {
                        $genero = Genero::find($externalProduct['generoId']);
                        if ($genero) {
                            $generoId = $genero->id;
                        }
                    }

                    // 2. Sincronizar sector
                    $sectorId = null;
                    if (isset($externalProduct['sector']) && isset($externalProduct['sector']['descripcion'])) {
                        $sector = Sector::firstOrCreate(
                            ['descripcion' => $externalProduct['sector']['descripcion']]
                        );
                        $sectorId = $sector->id;
                        if ($sector->wasRecentlyCreated) {
                            $stats['sectores_creados']++;
                        }
                    } elseif (isset($externalProduct['sectorId'])) {
                        $sector = Sector::find($externalProduct['sectorId']);
                        if ($sector) {
                            $sectorId = $sector->id;
                        }
                    }

                    // 3. Preparar datos del producto
                    $productData = [
                        'id' => $externalProduct['id_articulo'] ?? null,
                        'id_linea' => $externalProduct['id_linea'] ?? null,
                        'art_empresa' => $externalProduct['art_empresa'] ?? 1,
                        'id_provedor' => $externalProduct['id_provedor'] ?? null,
                        'descripcion' => $externalProduct['descripcion'] ?? null,
                        'marca' => $externalProduct['marca'] ?? null,
                        'tkmov' => $externalProduct['tkmov'] ?? null,
                        'tipo_venta' => $externalProduct['tipo_venta'] ?? null,
                        'iva' => $externalProduct['iva'] ?? null,
                        'costo' => $externalProduct['costo'] ?? 0,
                        'precio1' => $externalProduct['precio1'] ?? 0,
                        'precio2' => $externalProduct['precio2'] ?? 0,
                        'precio3' => $externalProduct['precio3'] ?? 0,
                        'precio4' => $externalProduct['precio4'] ?? 0,
                        'precio5' => $externalProduct['precio5'] ?? 0,
                        'precio6' => $externalProduct['precio6'] ?? 0,
                        'precio7' => $externalProduct['precio7'] ?? 0,
                        'precio8' => $externalProduct['precio8'] ?? 0,
                        'precio9' => $externalProduct['precio9'] ?? 0,
                        'precio10' => $externalProduct['precio10'] ?? 0,
                        'stockmin' => $externalProduct['stockmin'] ?? 0,
                        'stockmax' => $externalProduct['stockmax'] ?? 0,
                        'piezas' => $externalProduct['piezas'] ?? 0,
                        'proporcion' => $externalProduct['proporcion'] ?? null,
                        'sku' => $externalProduct['sku'] ?? null,
                        'ean' => $externalProduct['ean'] ?? null,
                        'composicion' => $externalProduct['composicion'] ?? null,
                        'notas' => $externalProduct['notas'] ?? null,
                        'imagen' => $externalProduct['imagen'] ?? null,
                        'fecha_alta' => $externalProduct['fecha_alta'] ?? $externalProduct['fechaCompra'] ?? null,
                        'fecha_compra' => $externalProduct['fechaCompra'] ?? null,
                        'activo' => $externalProduct['activo'] ?? 0,
                        'bandvend' => $externalProduct['bandvend'] ?? 0,
                        'presel' => $externalProduct['presel'] ?? 0,
                        'tipoa' => $externalProduct['tipoa'] ?? null,
                        'proma' => $externalProduct['proma'] ?? 0,
                        'promt' => $externalProduct['promt'] ?? 0,
                        'promr' => $externalProduct['promr'] ?? 0,
                        'id_molde' => $externalProduct['id_molde'] ?? null,
                        'precio_dll' => $externalProduct['precio_dll'] ?? 0,
                        'origen' => $externalProduct['origen'] ?? null,
                        'precio_porcen1' => $externalProduct['precio_porcen1'] ?? 0,
                        'precio_porcen2' => $externalProduct['precio_porcen2'] ?? 0,
                        'precio_porcen3' => $externalProduct['precio_porcen3'] ?? 0,
                        'precio_porcen4' => $externalProduct['precio_porcen4'] ?? 0,
                        'especificaciones' => $externalProduct['especificaciones'] ?? null,
                        'bom' => $externalProduct['bom'] ?? null,
                        'opc_expl' => $externalProduct['opc_expl'] ?? null,
                        'id_sublinea' => $externalProduct['id_sublinea'] ?? null,
                        'nombre_artd' => $externalProduct['nombre_artd'] ?? null,
                        'caja_med' => $externalProduct['caja_med'] ?? null,
                        'caja_peso' => $externalProduct['caja_peso'] ?? null,
                        'id_impresion' => $externalProduct['id_impresion'] ?? null,
                        'medidas_art' => $externalProduct['medidas_art'] ?? null,
                        'medidas_imp' => $externalProduct['medidas_imp'] ?? null,
                        'opc_desc' => $externalProduct['opc_desc'] ?? null,
                        'precio_mar' => $externalProduct['precio_mar'] ?? 0,
                        'arancel' => $externalProduct['arancel'] ?? 0,
                        'ancho_articulo' => $externalProduct['ancho_articulo'] ?? 0,
                        'alto_articulo' => $externalProduct['alto_articulo'] ?? 0,
                        'ancho_caja' => $externalProduct['ancho_caja'] ?? 0,
                        'largo_caja' => $externalProduct['largo_caja'] ?? 0,
                        'alto_caja' => $externalProduct['alto_caja'] ?? 0,
                        'fob_china' => $externalProduct['fob_china'] ?? 0,
                        'costo_aduana' => $externalProduct['costo_aduana'] ?? 0,
                        'opc_web' => $externalProduct['opc_web'] ?? null,
                        'url_video' => $externalProduct['url_video'] ?? null,
                        'id_articulo2' => $externalProduct['id_articulo2'] ?? null,
                        'opc_nuevo' => $externalProduct['opc_nuevo'] ?? null,
                        'opc_promo' => $externalProduct['opc_promo'] ?? null,
                        'desc_promo' => $externalProduct['desc_promo'] ?? 0,
                        'opc_tinta_azul' => $externalProduct['opc_tinta_azul'] ?? null,
                        'segunda_linea' => $externalProduct['segunda_linea'] ?? null,
                        'id_prod' => $externalProduct['id_prod'] ?? null,
                        'id_uni' => $externalProduct['id_uni'] ?? null,
                        'costo_r' => $externalProduct['costo_r'] ?? 0,
                        'imagen_esq' => $externalProduct['imagen_esq'] ?? null,
                        'tipoart' => $externalProduct['tipoart'] ?? null,
                        'precio_alto' => $externalProduct['precio_alto'] ?? 0,
                        'precio_anterior' => $externalProduct['precio_anterior'] ?? 0,
                        'costo_rmb' => $externalProduct['costo_rmb'] ?? 0,
                        'costo_tentativo' => $externalProduct['costo_tentativo'] ?? 0,
                        'costo_promedio' => $externalProduct['costo_promedio'] ?? 0,
                        'familia' => $externalProduct['familia'] ?? null,
                        'familia_1' => $externalProduct['familia_1'] ?? null,
                        'familia_2' => $externalProduct['familia_2'] ?? null,
                        'familia_3' => $externalProduct['familia_3'] ?? null,
                        'familia_4' => $externalProduct['familia_4'] ?? null,
                        'familia_5' => $externalProduct['familia_5'] ?? null,
                        'familia_6' => $externalProduct['familia_6'] ?? null,
                        'familia_7' => $externalProduct['familia_7'] ?? null,
                        'cod_color' => $externalProduct['cod_color'] ?? null,
                        'codbarra' => $externalProduct['codbarra'] ?? null,
                        'codigo_prv' => $externalProduct['codigo_prv'] ?? null,
                        'i_raiz' => $externalProduct['i_raiz'] ?? null,
                        'ict' => $externalProduct['ict'] ?? null,
                        'campo_info_prv' => $externalProduct['campo_info_prv'] ?? null,
                        'unidad' => $externalProduct['unidad'] ?? null,
                        'tipo_empaque' => $externalProduct['tipo_empaque'] ?? null,
                        'temporada' => $externalProduct['temporada'] ?? null,
                        'opc_catalogo' => $externalProduct['opc_catalogo'] ?? null,
                        'catalogoId' => $externalProduct['catalogoId'] ?? null,
                        'genero_id' => $generoId,
                        'sector_id' => $sectorId,
                        'fechaAct' => $externalProduct['fechaAct'] ?? null,
                        'opcinsert' => $externalProduct['opcinsert'] ?? null,
                        'cantidad' => $externalProduct['cantidad'] ?? 0,
                        'inventario' => $externalProduct['inventario'] ?? 0,
                        'idTienda' => $externalProduct['idTienda'] ?? 0,
                        'descuento' => $externalProduct['descuento'] ?? 0,
                    ];

                    // Validar que tenga id_articulo
                    if (empty($productData['id'])) {
                        $bar->advance();
                        continue;
                    }

                    $existingProducto = Producto::query()->whereKey($productData['id'])->first();
                    $previousInventario = $existingProducto ? (float) $existingProducto->inventario : 0.0;
                    $newInventario = (float) ($productData['inventario'] ?? 0);

                    // 4. Crear o actualizar producto
                    $producto = Producto::updateOrCreate(
                        ['id' => $productData['id']],
                        $productData
                    );

                    if ($previousInventario > 0 && $newInventario <= 0) {
                        ProductNotification::resetNotifiedForProducts([(string) $producto->id]);
                    }

                    if ($previousInventario <= 0 && $newInventario > 0) {
                        $pendingNotifications = ProductNotification::query()
                            ->where('producto_id', $producto->id)
                            ->where('is_notified', false)
                            ->with(['user'])
                            ->get();

                        foreach ($pendingNotifications as $productNotification) {
                            $recipient = $productNotification->user;
                            if ($recipient && $recipient->email) {
                                Mail::to($recipient)->send(new ProductAvailableEmail($productNotification));
                            }
                        }
                    }

                    if ($producto->wasRecentlyCreated) {
                        $stats['productos_creados']++;
                    } else {
                        $stats['productos_actualizados']++;
                    }

                    $prevInventoryByDetalleId = Producto::snapshotInventoryByDetalleIdForProduct((string) $producto->id);

                    // 5. Sincronizar detalles
                    if (isset($externalProduct['detalles']) && is_array($externalProduct['detalles'])) {
                        foreach ($externalProduct['detalles'] as $externalDetalle) {
                            if (!isset($externalDetalle['id_artd'])) {
                                continue;
                            }

                            $detalleId = $externalDetalle['id_artd'];
                            $detalleData = [
                                'id' => $detalleId,
                                'producto_id' => $producto->id,
                                'art_empresa' => $externalDetalle['art_empresa'] ?? 1,
                                'modelo' => $externalDetalle['modelo'] ?? null,
                                'detalle' => $externalDetalle['detalle'] ?? null,
                                'codbarra' => $externalDetalle['codbarra'] ?? null,
                                'ean' => $externalDetalle['ean'] ?? null,
                                'sku' => $externalDetalle['sku'] ?? null,
                                'color_file' => $externalDetalle['color_file'] ?? null,
                                'opc_web' => $externalDetalle['opc_web'] ?? null,
                                'orden' => $externalDetalle['orden'] ?? 0,
                                'inventario_d' => $externalDetalle['inventario_d'] ?? 0,
                                'idShopify' => $externalDetalle['idShopify'] ?? null,
                                'nombreColor' => $externalDetalle['nombreColor'] ?? null,
                                'fechaMovimiento' => isset($externalDetalle['fechaMovimiento']) ? $externalDetalle['fechaMovimiento'] : null,
                            ];

                            $detalle = Detalle::find($detalleId);

                            if ($detalle) {
                                $detalle->update($detalleData);
                                $stats['detalles_actualizados']++;
                            } else {
                                Detalle::create($detalleData);
                                $stats['detalles_creados']++;
                            }
                        }
                    }

                    $stockReceivedIncremented = Producto::incrementStockReceivedWhenTotalPiecesIncreasedAfterSync(
                        $producto,
                        $prevInventoryByDetalleId
                    );
                    if ($stockReceivedIncremented) {
                        Log::info('products:sync: stock_received_count +1 (total piezas aumentó tras sync)', [
                            'producto_id' => $producto->id,
                            'stock_received_count' => $producto->fresh()->stock_received_count,
                        ]);
                    }

                    $bar->advance();

                } catch (\Exception $e) {
                    Log::error('Error procesando producto: ' . $e->getMessage(), [
                        'product_id' => $externalProduct['id_articulo'] ?? 'unknown',
                        'trace' => $e->getTraceAsString()
                    ]);
                    $bar->advance();
                    continue;
                }
            }

            $bar->finish();
            $this->newLine();

            DB::commit();

            // Registrar en historial
            Historial::create([
                'ejecutado_at' => now(),
                'estado' => 'exitoso',
                'mensaje' => 'Sincronización completada exitosamente'
            ]);

            $this->info('✅ Sincronización completada exitosamente!');
            $this->newLine();
            $this->table(
                ['Métrica', 'Cantidad'],
                [
                    ['Total productos procesados', $stats['total_productos']],
                    ['Géneros creados', $stats['generos_creados']],
                    ['Sectores creados', $stats['sectores_creados']],
                    ['Productos creados', $stats['productos_creados']],
                    ['Productos actualizados', $stats['productos_actualizados']],
                    ['Detalles creados', $stats['detalles_creados']],
                    ['Detalles actualizados', $stats['detalles_actualizados']],
                ]
            );
            $this->newLine();
            $this->info('Registro guardado en el historial de sincronizaciones.');
            
            Log::info('✅ Comando products:sync completado exitosamente');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            
            // Registrar error en historial
            Historial::create([
                'ejecutado_at' => now(),
                'estado' => 'error',
                'mensaje' => 'Error al sincronizar productos: ' . $e->getMessage()
            ]);
            
            $this->error('❌ Error en sincronización: ' . $e->getMessage());
            Log::error('Error en sincronización de productos: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}
