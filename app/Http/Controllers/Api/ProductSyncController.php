<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Genero;
use App\Models\Sector;
use App\Models\Producto;
use App\Models\Detalle;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductSyncController extends Controller
{
    private const EXTERNAL_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

    /**
     * Sincronizar productos desde la API externa
     */
    public function sync(): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Obtener productos de la API externa
            $response = Http::timeout(120)->get(self::EXTERNAL_API_URL);

            if (!$response->successful()) {
                throw new \Exception('Error al conectar con la API externa: ' . $response->status());
            }

            $externalProducts = $response->json();

            if (!is_array($externalProducts)) {
                throw new \Exception('La respuesta de la API no es un array válido');
            }

            $stats = [
                'generos_creados' => 0,
                'sectores_creados' => 0,
                'productos_creados' => 0,
                'productos_actualizados' => 0,
                'detalles_creados' => 0,
                'detalles_actualizados' => 0,
                'total_productos' => count($externalProducts)
            ];

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
                        // Si viene solo el ID, buscar por ID
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
                        // Si viene solo el ID, buscar por ID
                        $sector = Sector::find($externalProduct['sectorId']);
                        if ($sector) {
                            $sectorId = $sector->id;
                        }
                    }

                    // 3. Preparar datos del producto (excluyendo detalles, genero, sector, linea)
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
                        'fecha_alta' => isset($externalProduct['fecha_alta']) ? $externalProduct['fecha_alta'] : null,
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
                        Log::warning('Producto sin id_articulo, saltando...', ['product' => $externalProduct]);
                        continue;
                    }

                    // 4. Crear o actualizar producto
                    $producto = Producto::updateOrCreate(
                        ['id' => $productData['id']],
                        $productData
                    );

                    if ($producto->wasRecentlyCreated) {
                        $stats['productos_creados']++;
                    } else {
                        $stats['productos_actualizados']++;
                    }

                    // 5. Sincronizar detalles
                    if (isset($externalProduct['detalles']) && is_array($externalProduct['detalles'])) {
                        foreach ($externalProduct['detalles'] as $externalDetalle) {
                            $detalleData = [
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

                            // Validar que tenga id_artd
                            if (!isset($externalDetalle['id_artd'])) {
                                Log::warning('Detalle sin id_artd, saltando...', ['detalle' => $externalDetalle]);
                                continue;
                            }

                            $detalleId = $externalDetalle['id_artd'];
                            $detalleData['id'] = $detalleId;

                            // Buscar detalle por id_artd
                            $detalle = Detalle::find($detalleId);

                            if ($detalle) {
                                // Actualizar detalle existente
                                $detalle->update($detalleData);
                                $stats['detalles_actualizados']++;
                            } else {
                                // Crear nuevo detalle
                                Detalle::create($detalleData);
                                $stats['detalles_creados']++;
                            }
                        }
                    }

                } catch (\Exception $e) {
                    Log::error('Error procesando producto: ' . $e->getMessage(), [
                        'product_id' => $externalProduct['id_articulo'] ?? 'unknown',
                        'trace' => $e->getTraceAsString()
                    ]);
                    // Continuar con el siguiente producto
                    continue;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sincronización completada exitosamente',
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en sincronización de productos: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al sincronizar productos: ' . $e->getMessage()
            ], 500);
        }
    }
}
