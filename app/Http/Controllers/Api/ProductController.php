<?php

namespace App\Http\Controllers\Api;

use App\Support\CatalogOfferDate;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use App\Models\Review;
use App\Support\ProductNewEvaluator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * Obtener producto completo por ID
     * Devuelve toda la información del producto incluyendo detalles para ProductPage
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            // Buscar producto con sus detalles (sin caché para datos de BD)
            $producto = DB::table('productos')
                ->where('id', $id)
                ->first();

            if (!$producto) {
                return response()->json([
                    'success' => false,
                    'error' => 'Producto no encontrado'
                ], 404);
            }

            if (! empty($producto->fecha_agotado)) {
                $cutoff = now()->subDays(30)->startOfDay();
                if (Carbon::parse($producto->fecha_agotado)->startOfDay()->lt($cutoff)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Producto no encontrado',
                    ], 404);
                }
            }

            // Obtener todos los detalles del producto
            $detalles = DB::table('detalles')
                ->where('producto_id', $id)
                ->orderBy('orden')
                ->get()
                ->map(function ($detalle) {
                    return [
                        'id' => $detalle->id,
                        'producto_id' => $detalle->producto_id,
                        'art_empresa' => $detalle->art_empresa,
                        'modelo' => $detalle->modelo,
                        'detalle' => $detalle->detalle, // Talla
                        'codbarra' => $detalle->codbarra,
                        'ean' => $detalle->ean,
                        'sku' => $detalle->sku,
                        'color_file' => $detalle->color_file,
                        'opc_web' => $detalle->opc_web,
                        'orden' => $detalle->orden,
                        'inventario_d' => (float) $detalle->inventario_d,
                        'idShopify' => $detalle->idShopify,
                        'nombreColor' => $detalle->nombreColor, // Color
                        'fechaMovimiento' => $detalle->fechaMovimiento ? date('Y-m-d', strtotime($detalle->fechaMovimiento)) : null
                    ];
                })
                ->toArray();

            // Convertir precio correctamente
            $precio1Raw = $producto->precio1;
            $precio1 = 0;
            if (is_numeric($precio1Raw)) {
                $precio1 = (float) $precio1Raw;
            } elseif (is_string($precio1Raw)) {
                $precio1 = (float) str_replace(',', '', $precio1Raw);
            }

            // Calcular precio original y descuento
            // Si tiene desc_promo > 0, aplicar descuento (independientemente de opc_promo)
            // precio1 es el precio BASE/ORIGINAL, no el precio con descuento aplicado
            $descPromoValue = (float) ($producto->desc_promo ?? 0);
            $hasDiscount = $descPromoValue > 0;
            // Reducir 10% al descuento (mínimo 0)
            $discountPercentage = $hasDiscount ? CatalogOfferDate::catalogRebajaPercent($descPromoValue, $request->user()) : 0;
            // El precio original es precio1 (ya que precio1 es el precio base)
            $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
            // Calcular precio final con descuento reducido aplicado sobre precio1
            $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                : $precio1;

            $isNew = ProductNewEvaluator::isNewLikeNuevosPage(
                $producto->fecha_compra ?? null,
                (float) ($producto->inventario ?? 0),
                $detalles
            );

            // Obtener colores únicos
            $colors = [];
            foreach ($detalles as $detalle) {
                if (!empty($detalle['nombreColor']) && !in_array($detalle['nombreColor'], $colors)) {
                    $colors[] = $detalle['nombreColor'];
                }
            }

            // Calcular rating desde la tabla reviews (solo aprobadas)
            // Sumar todas las estrellas y dividir entre el total de reseñas aprobadas
            $reviews = Review::where('product_id', $id)
                ->where('is_approved', true)
                ->get();
            
            $rating = 0;
            $ratingCount = count($reviews);
            if ($ratingCount > 0) {
                // Sumar todas las estrellas
                $sumRatings = $reviews->sum('rating');
                // Dividir entre el total de reseñas
                $rating = round($sumRatings / $ratingCount, 2);
            }

            $inventarioSumDetalles = collect($detalles)->sum(fn (array $d) => Producto::effectiveDetailInventoryContribution($d['inventario_d'] ?? null));
            $inventarioTotalProducto = count($detalles) > 0
                ? $inventarioSumDetalles
                : Producto::effectiveDetailInventoryContribution($producto->inventario ?? 0);

            // Filtro principal unificado (Próximamente / Nuevo / Agotado / En Rebaja).
            /** @var array{status:string,is_in_stock:bool,is_new:bool,is_coming_soon:bool,is_out_of_stock:bool,is_on_sale:bool} $statusEval */
            $statusEval = \App\Support\ProductStatusEvaluator::evaluate(
                is_array($producto) ? $producto : (array) $producto,
                $inventarioTotalProducto
            );
            $isComingSoon = $statusEval['is_coming_soon'];

            // Obtener reseñas aprobadas con información del usuario
            $approvedReviews = Review::where('product_id', $id)
                ->where('is_approved', true)
                ->with('user:id,first_name,last_name')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($review) {
                    return [
                        'id' => $review->id,
                        'rating' => $review->rating,
                        'comment' => $review->comment,
                        'images' => $review->images,
                        'created_at' => $review->created_at->format('d/m/Y'),
                        'user' => [
                            'name' => $review->user ? ($review->user->first_name . ' ' . substr($review->user->last_name, 0, 1) . '.') : 'Usuario',
                            'avatar' => null
                        ]
                    ];
                });

            // Construir respuesta completa con todos los campos necesarios para ProductPage
            $response = [
                'success' => true,
                'data' => [
                    // Campos principales del producto
                    'id_articulo' => $producto->id,
                    'id' => $producto->id,
                    'id_linea' => $producto->id_linea ?? null,
                    'descripcion' => $producto->descripcion,
                    'marca' => $producto->marca,
                    'precio1' => $precio1,
                    'precio2' => (float) ($producto->precio2 ?? 0),
                    'precio3' => (float) ($producto->precio3 ?? 0),
                    'precio4' => (float) ($producto->precio4 ?? 0),
                    'precio5' => (float) ($producto->precio5 ?? 0),
                    'precio6' => (float) ($producto->precio6 ?? 0),
                    'precio7' => (float) ($producto->precio7 ?? 0),
                    'precio8' => (float) ($producto->precio8 ?? 0),
                    'precio9' => (float) ($producto->precio9 ?? 0),
                    'precio10' => (float) ($producto->precio10 ?? 0),
                    'costo' => (float) ($producto->costo ?? 0),
                    'imagen' => $producto->imagen,
                    'piezas' => $producto->piezas ?? 0,
                    'inventario' => (float) ($producto->inventario ?? 0),
                    'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
                    'especificaciones' => $producto->especificaciones ?? null,
                    'linea' => $producto->id_linea ?? null,
                    'sector' => $producto->sector_id ?? null,
                    'genero' => $producto->genero_id ?? null,
                    'notas' => $producto->notas ?? null,
                    'art_empresa' => $producto->art_empresa ?? 1,
                    'id_provedor' => $producto->id_provedor ?? null,
                    'tkmov' => $producto->tkmov ?? null,
                    'tipo_venta' => $producto->tipo_venta ?? null,
                    'iva' => $producto->iva ?? null,
                    'stockmin' => $producto->stockmin ?? 0,
                    'stockmax' => $producto->stockmax ?? 0,
                    'proporcion' => $producto->proporcion ?? null,
                    'sku' => $producto->sku ?? null,
                    'ean' => $producto->ean ?? null,
                    'codbarra' => $producto->codbarra ?? null,
                    'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                    'fecha_compra' => ProductNewEvaluator::formatFechaCompraForApi($producto->fecha_compra ?? null),
                    'activo' => $producto->activo ?? 1,
                    'tipoart' => $producto->tipoart ?? null,
                    'url_video' => $producto->url_video ?? null,
                    'descuento' => (float) ($producto->descuento ?? 0),
                    'catalogoId' => $producto->catalogoId ?? null,
                    'generoId' => $producto->genero_id ?? null,
                    'sectorId' => $producto->sector_id ?? null,
                    'fechaAct' => $producto->fechaAct ?? null,
                    
                    // Campos de promoción
                    'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                    'opc_promo' => $producto->opc_promo ?? 'N',
                    'desc_promo' => (float) ($producto->desc_promo ?? 0),

                    // Filtro principal (ProductoStatusEvaluator)
                    'status' => $statusEval['status'],
                    'is_coming_soon' => $statusEval['is_coming_soon'],
                    'is_out_of_stock' => $statusEval['is_out_of_stock'],
                    'is_in_stock' => $statusEval['is_in_stock'],
                    'is_on_sale' => $statusEval['is_on_sale'],
                    'stock_kind' => $statusEval['status'],

                    // Campos calculados
                    'price' => $finalPrice, // Precio final con descuento reducido aplicado
                    'precio1' => $precio1, // Precio base original
                    'originalPrice' => $hasDiscount ? $originalPrice : null,
                    'discount' => $discountPercentage, // Descuento reducido (desc_promo - 10)
                    'isNew' => $isNew,
                    'colors' => $colors,
                    'colores' => $colors, // Alias para compatibilidad
                    
                    // Detalles completos
                    'detalles' => $detalles,
                    
                    // Campos adicionales para compatibilidad
                    'title' => $producto->descripcion,
                    'image' => $producto->imagen,
                    'stock' => (float) ($producto->inventario ?? 0),
                    'rating' => $rating,
                    'ratingCount' => $ratingCount,
                    'totalRatings' => $ratingCount,
                    
                    // Reseñas aprobadas
                    'reviews' => $approvedReviews
                ]
            ];

            // Sin caché - siempre retornar datos frescos de la BD
            return response()->json($response);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener el producto: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos nuevos (últimos 30 días)
     * Limitado a 4 productos para la sección "Checa lo mas nuevo"
     */
    public function getNewProducts(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 4);
            
            // Calcular fecha límite (30 días atrás desde hoy)
            $thirtyDaysAgoDate = now()->subDays(30)->format('Y-m-d');

            $rows = DB::table('productos')
                ->leftJoin('detalles', 'productos.id', '=', 'detalles.producto_id')
                ->select(
                    'productos.id',
                    'productos.descripcion',
                    'productos.marca',
                    'productos.precio1',
                    'productos.precio2',
                    'productos.precio3',
                    'productos.precio4',
                    'productos.precio5',
                    'productos.precio6',
                    'productos.precio7',
                    'productos.precio8',
                    'productos.precio9',
                    'productos.precio10',
                    'productos.imagen',
                    'productos.inventario',
                    'productos.fecha_alta',
                    'productos.fecha_compra',
                    'productos.opc_nuevo',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.sector_id',
                    'productos.genero_id',
                    'productos.stock_received_count',
                    'detalles.nombreColor',
                    'detalles.detalle',
                    'detalles.inventario_d'
                )
                ->whereNotNull('productos.fecha_compra')
                ->where('productos.fecha_compra', '>=', $thirtyDaysAgoDate);
            Producto::applyFechaAgotadoVisibilityToProductosQuery($rows);
            $rows = $rows->get();

            $productos = $rows->groupBy('id')
                ->map(function ($productGroup) use ($request) {
                    $producto = $productGroup->first();
                    
                    // Convertir precio
                    $precio1Raw = $producto->precio1;
                    $precio1 = 0;
                    if (is_numeric($precio1Raw)) {
                        $precio1 = (float) $precio1Raw;
                    } elseif (is_string($precio1Raw)) {
                        $precio1 = (float) str_replace(',', '', $precio1Raw);
                    }

                    // Calcular descuento
                    $descPromoValue = (float) ($producto->desc_promo ?? 0);
                    $hasDiscount = $descPromoValue > 0;
                    $discountPercentage = $hasDiscount ? CatalogOfferDate::catalogRebajaPercent($descPromoValue, $request->user()) : 0;
                    $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                    $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                        ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                        : $precio1;

                    // Obtener colores y tallas únicos
                    $colors = $productGroup->pluck('nombreColor')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                    
                    $sizes = $productGroup->pluck('detalle')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();

                    $sumDet = $productGroup->sum(fn ($row) => Producto::effectiveDetailInventoryContribution($row->inventario_d ?? null));
                    $hasDetailRows = $productGroup->contains(fn ($row) => isset($row->detalle_id) && $row->detalle_id !== null);
                    $inventarioTotal = $hasDetailRows
                        ? $sumDet
                        : Producto::effectiveDetailInventoryContribution($producto->inventario ?? 0);

                    $detalleRowsInv = $productGroup->map(fn ($row) => ['inventario_d' => $row->inventario_d ?? null])->all();
                    $isNewComputed = ProductNewEvaluator::isNewLikeNuevosPage(
                        $producto->fecha_compra ?? null,
                        (float) ($producto->inventario ?? 0),
                        $detalleRowsInv
                    );

                    // Obtener rating
                    $reviews = Review::where('product_id', $producto->id)
                        ->where('is_approved', true)
                        ->get();
                    
                    $rating = 0;
                    $ratingCount = count($reviews);
                    if ($ratingCount > 0) {
                        $rating = round($reviews->sum('rating') / $ratingCount, 2);
                    }

                    return [
                        'id' => $producto->id,
                        'id_articulo' => $producto->id,
                        'title' => $producto->descripcion,
                        'description' => $producto->descripcion,
                        'price' => $finalPrice,
                        'originalPrice' => $originalPrice,
                        'discount' => $discountPercentage,
                        'image' => $this->getProductImageUrl($producto->id, $producto->imagen),
                        'brand' => $producto->marca ?? 'Sin marca',
                        'stock' => $inventarioTotal,
                        'inventario' => $inventarioTotal,
                        'colors' => $colors,
                        'sizes' => $sizes,
                        'isNew' => $isNewComputed,
                        'rating' => $rating,
                        'ratingCount' => $ratingCount,
                        'id_linea' => $producto->id_linea,
                        'category_id' => $producto->id_linea,
                        'catalogoId' => $producto->catalogoId,
                        'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                        'fecha_compra' => ProductNewEvaluator::formatFechaCompraForApi($producto->fecha_compra ?? null),
                        'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                        'opc_promo' => $producto->opc_promo ?? 'N',
                        'desc_promo' => $descPromoValue,
                        'stock_received_count' => (int) ($producto->stock_received_count ?? 0)
                    ];
                })
                ->filter(function ($producto) {
                    return $producto !== null && ($producto['stock'] ?? 0) > 0.00001;
                })
                ->shuffle()
                ->take((int) $limit)
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $productos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos nuevos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos próximamente.
     *
     * Filtro principal: delega en {@see \App\Support\ProductStatusEvaluator}.
     * Antes se usaba la heurística "3er dígito del ID = último dígito del año". Esa regla
     * fue removida y ahora se usan:
     *   - inventario total = 0
     *   - stock_received_count = 0
     *   - fecha_alta nula / reciente (≤ 90 días) / futura, o bien opc_nuevo='S'
     *   - sin oferta desc_promo activa
     *
     * Limitado a 4 productos para la sección "Próximamente" (por defecto).
     */
    public function getComingSoonProducts(Request $request): JsonResponse
    {
        try {
            $limit = $request->input('limit', 4);

            // Filtro SQL equivalente a ProductStatusEvaluator::isNewArrivalFromRow()
            // (sin oferta activa, sin recepciones previas y con fecha_alta nula o dentro
            // de los últimos 90 días — incluyendo futura).
            $newArrivalCutoff = now()->subDays(\App\Support\ProductStatusEvaluator::NEW_ARRIVAL_WINDOW_DAYS)->format('Y-m-d');

            $query = DB::table('productos')
                ->leftJoin('detalles', 'productos.id', '=', 'detalles.producto_id')
                ->select(
                    'productos.id',
                    'productos.descripcion',
                    'productos.marca',
                    'productos.precio1',
                    'productos.precio2',
                    'productos.precio3',
                    'productos.precio4',
                    'productos.precio5',
                    'productos.precio6',
                    'productos.precio7',
                    'productos.precio8',
                    'productos.precio9',
                    'productos.precio10',
                    'productos.imagen',
                    'productos.inventario',
                    'productos.fecha_alta',
                    'productos.opc_nuevo',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.sector_id',
                    'productos.genero_id',
                    'productos.stock_received_count',
                    'detalles.id as detalle_id',
                    'detalles.producto_id',
                    'detalles.nombreColor',
                    'detalles.detalle',
                    'detalles.inventario_d'
                )
                ->where('productos.stock_received_count', '=', 0) // nunca ha recibido stock
                ->where(function ($q) {
                    // sin oferta activa
                    $q->whereNull('productos.desc_promo')
                        ->orWhere('productos.desc_promo', '<=', 0);
                })
                ->where(function ($q) use ($newArrivalCutoff) {
                    // recién llegado: opc_nuevo='S' o fecha_alta nula / reciente / futura
                    $q->where('productos.opc_nuevo', 'S')
                        ->orWhereNull('productos.fecha_alta')
                        ->orWhere('productos.fecha_alta', '>=', $newArrivalCutoff);
                });

            Producto::applyFechaAgotadoVisibilityToProductosQuery($query);

            $query = $query->inRandomOrder()->distinct();
            
            // Aplicar límite solo si se especifica y es menor a 10000
            if ($limit !== null && $limit < 10000) {
                $query = $query->limit($limit);
            }
            
            $productos = $query->get()
                ->groupBy('id')
                ->map(function ($productGroup) use ($request) {
                    $producto = $productGroup->first();
                    
                    // Convertir precio
                    $precio1Raw = $producto->precio1;
                    $precio1 = 0;
                    if (is_numeric($precio1Raw)) {
                        $precio1 = (float) $precio1Raw;
                    } elseif (is_string($precio1Raw)) {
                        $precio1 = (float) str_replace(',', '', $precio1Raw);
                    }

                    // Calcular descuento
                    $descPromoValue = (float) ($producto->desc_promo ?? 0);
                    $hasDiscount = $descPromoValue > 0;
                    $discountPercentage = $hasDiscount ? CatalogOfferDate::catalogRebajaPercent($descPromoValue, $request->user()) : 0;
                    $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                    $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                        ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                        : $precio1;

                    // Obtener colores y tallas únicos
                    $colors = $productGroup->pluck('nombreColor')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                    
                    $sizes = $productGroup->pluck('detalle')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();

                    // Inventario total alineado al frontend (getTotalInventoryFromProduct): la suma de inventario_d con detalles debe ser exactamente 0 para próximamente
                    $inventarioTotal = $this->computeTotalInventoryLikeFrontend($productGroup, $producto);

                    if (abs($inventarioTotal) > 0.00001) {
                        return null;
                    }
                    
                    // FILTRO CRÍTICO Condición 3: stock_received_count debe ser 0
                    // Si el producto ya recibió stock alguna vez, excluirlo de "Próximamente"
                    $stockReceivedCount = (int) ($producto->stock_received_count ?? 0);
                    if ($stockReceivedCount > 0) {
                        return null; // Excluir productos que ya recibieron stock
                    }
                    
                    // Obtener rating
                    $reviews = Review::where('product_id', $producto->id)
                        ->where('is_approved', true)
                        ->get();
                    
                    $rating = 0;
                    $ratingCount = count($reviews);
                    if ($ratingCount > 0) {
                        $rating = round($reviews->sum('rating') / $ratingCount, 2);
                    }

                    // Mapear detalles (solo filas reales; coherente con computeTotalInventoryLikeFrontend)
                    $detalles = $productGroup
                        ->filter(function ($detalle) {
                            return isset($detalle->detalle_id) && $detalle->detalle_id !== null;
                        })
                        ->map(function ($detalle) {
                            return [
                                'id' => $detalle->detalle_id,
                                'producto_id' => $detalle->producto_id ?? null,
                                'nombreColor' => $detalle->nombreColor ?? null,
                                'detalle' => $detalle->detalle ?? null,
                                'inventario_d' => (float) ($detalle->inventario_d ?? 0)
                            ];
                        })->values()->toArray();

                    // Filtro principal: confirmar nuevamente con el evaluador (incluye la lógica PHP
                    // que el SQL aproxima, por si hay drift).
                    $rowForEval = (array) $producto;
                    $rowForEval['inventario_total'] = $inventarioTotal;
                    $statusEval = \App\Support\ProductStatusEvaluator::evaluate(
                        $rowForEval,
                        $inventarioTotal,
                        array_map(
                            fn ($d) => ['inventario_d' => $d->inventario_d ?? null],
                            $productGroup->filter(fn ($d) => isset($d->detalle_id) && $d->detalle_id !== null)->all()
                        )
                    );
                    if ($statusEval['status'] !== \App\Support\ProductStatusEvaluator::STATUS_COMING_SOON) {
                        return null;
                    }

                    return [
                        'id' => $producto->id,
                        'id_articulo' => $producto->id,
                        'title' => $producto->descripcion,
                        'description' => $producto->descripcion,
                        'price' => $finalPrice,
                        'originalPrice' => $originalPrice,
                        'discount' => $discountPercentage,
                        'image' => $this->getProductImageUrl($producto->id, $producto->imagen),
                        'brand' => $producto->marca ?? 'Sin marca',
                        'stock' => $inventarioTotal,
                        'inventario' => $inventarioTotal,
                        'colors' => $colors,
                        'sizes' => $sizes,

                        // Filtro principal (ProductoStatusEvaluator)
                        'status' => $statusEval['status'],
                        'isNew' => false, // Coming soon are not "new" in this context
                        'is_coming_soon' => true,
                        'is_out_of_stock' => false,
                        'is_in_stock' => false,
                        'is_on_sale' => $statusEval['is_on_sale'],
                        'stock_kind' => $statusEval['status'],

                        'rating' => $rating,
                        'ratingCount' => $ratingCount,
                        'id_linea' => $producto->id_linea,
                        'category_id' => $producto->id_linea,
                        'catalogoId' => $producto->catalogoId,
                        'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                        'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                        'opc_promo' => $producto->opc_promo ?? 'N',
                        'desc_promo' => $descPromoValue,
                        'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
                        'detalles' => $detalles
                    ];
                })
                ->filter(function ($producto) {
                    // FILTRO CRÍTICO: Excluir productos null (que fueron filtrados por tener stock > 0 o stock_received_count > 0)
                    return $producto !== null;
                })
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $productos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos próximamente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener productos sugeridos relacionados a un producto específico
     * Basado en: misma línea, mismo género, mismo sector, con stock disponible
     * 
     * @param Request $request
     * @param string $id - ID del producto actual (string)
     * @return JsonResponse
     */
    public function suggested(Request $request, $id): JsonResponse
    {
        try {
            $limit = $request->input('limit', 8); // 8 productos aleatorios
            
            // Verificar que el producto actual existe
            $currentProduct = DB::table('productos')
                ->where('id', $id)
                ->first();
            
            if (!$currentProduct) {
                return response()->json([
                    'success' => false,
                    'error' => 'Producto no encontrado'
                ], 404);
            }
            
            // Obtener todos los IDs de productos con stock disponible (excluyendo el actual)
            // Primero obtener todos los productos
            $allProductIdsQuery = DB::table('productos')
                ->where('productos.id', '!=', $id); // Excluir el producto actual
            Producto::applyFechaAgotadoVisibilityToProductosQuery($allProductIdsQuery);
            $allProductIds = $allProductIdsQuery->pluck('id')->toArray();
            
            if (empty($allProductIds)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            // Calcular stock total por producto (suma de inventario_d)
            $productStocks = DB::table('detalles')
                ->whereIn('producto_id', $allProductIds)
                ->select('producto_id', DB::raw('SUM(GREATEST(IFNULL(inventario_d, 0), 0)) as total_stock'))
                ->groupBy('producto_id')
                ->pluck('total_stock', 'producto_id')
                ->toArray();
            
            // Obtener inventario general de productos
            $productInventories = DB::table('productos')
                ->whereIn('id', $allProductIds)
                ->pluck('inventario', 'id')
                ->toArray();
            
            // Filtrar productos con stock disponible
            $productsWithStock = [];
            foreach ($allProductIds as $productId) {
                $stockFromDetails = (float) ($productStocks[$productId] ?? 0);
                $stockFromProduct = Producto::effectiveDetailInventoryContribution($productInventories[$productId] ?? 0);
                $totalStock = $stockFromDetails > 0.00001 ? $stockFromDetails : $stockFromProduct;
                
                if ($totalStock > 0) {
                    $productsWithStock[] = $productId;
                }
            }
            
            if (empty($productsWithStock)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            // Mezclar aleatoriamente y tomar el límite solicitado
            shuffle($productsWithStock);
            $randomProductIds = array_slice($productsWithStock, 0, min($limit, count($productsWithStock)));
            
            if (empty($randomProductIds)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            // Obtener productos aleatorios con sus detalles
            $productos = DB::table('productos')
                ->leftJoin('detalles', 'productos.id', '=', 'detalles.producto_id')
                ->select(
                    'productos.id',
                    'productos.descripcion',
                    'productos.marca',
                    'productos.precio1',
                    'productos.precio2',
                    'productos.precio3',
                    'productos.precio4',
                    'productos.precio5',
                    'productos.precio6',
                    'productos.precio7',
                    'productos.precio8',
                    'productos.precio9',
                    'productos.precio10',
                    'productos.imagen',
                    'productos.inventario',
                    'productos.fecha_alta',
                    'productos.opc_nuevo',
                    'productos.opc_promo',
                    'productos.desc_promo',
                    'productos.id_linea',
                    'productos.catalogoId',
                    'productos.sector_id',
                    'productos.genero_id',
                    'productos.stock_received_count',
                    'detalles.nombreColor',
                    'detalles.detalle',
                    'detalles.inventario_d'
                )
                ->whereIn('productos.id', $randomProductIds)
                ->inRandomOrder() // Orden aleatorio
                ->get()
                ->groupBy('id')
                ->map(function ($productGroup) use ($request) {
                    $producto = $productGroup->first();
                    
                    // Convertir precio
                    $precio1Raw = $producto->precio1;
                    $precio1 = 0;
                    if (is_numeric($precio1Raw)) {
                        $precio1 = (float) $precio1Raw;
                    } elseif (is_string($precio1Raw)) {
                        $precio1 = (float) str_replace(',', '', $precio1Raw);
                    }

                    // Calcular descuento
                    $descPromoValue = (float) ($producto->desc_promo ?? 0);
                    $hasDiscount = $descPromoValue > 0;
                    $discountPercentage = $hasDiscount ? CatalogOfferDate::catalogRebajaPercent($descPromoValue, $request->user()) : 0;
                    $originalPrice = $hasDiscount && $precio1 > 0 ? $precio1 : null;
                    $finalPrice = $hasDiscount && $discountPercentage > 0 && $precio1 > 0 
                        ? ($precio1 - ($precio1 * ($discountPercentage / 100))) 
                        : $precio1;

                    // Obtener colores y tallas únicos
                    $colors = $productGroup->pluck('nombreColor')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();
                    
                    $sizes = $productGroup->pluck('detalle')
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();

                    $sumDet = $productGroup->sum(fn ($row) => Producto::effectiveDetailInventoryContribution($row->inventario_d ?? null));
                    $hasDetailRows = $productGroup->contains(fn ($row) => isset($row->detalle_id) && $row->detalle_id !== null);
                    $inventarioTotal = $hasDetailRows
                        ? $sumDet
                        : Producto::effectiveDetailInventoryContribution($producto->inventario ?? 0);

                    // Obtener rating
                    $reviews = Review::where('product_id', $producto->id)
                        ->where('is_approved', true)
                        ->get();
                    
                    $rating = 0;
                    $ratingCount = count($reviews);
                    if ($ratingCount > 0) {
                        $rating = round($reviews->sum('rating') / $ratingCount, 2);
                    }

                    $isNew = false;
                    if ($producto->fecha_alta) {
                        $fechaAltaTimestamp = strtotime($producto->fecha_alta);
                        $thirtyDaysAgo = time() - (30 * 24 * 60 * 60);
                        if ($fechaAltaTimestamp && $fechaAltaTimestamp > $thirtyDaysAgo) {
                            $isNew = true;
                        }
                    }

                    // Mapear detalles
                    $detalles = $productGroup->map(function ($detalle) {
                        return [
                            'id' => $detalle->id ?? null,
                            'producto_id' => $detalle->producto_id ?? null,
                            'nombreColor' => $detalle->nombreColor ?? null,
                            'detalle' => $detalle->detalle ?? null,
                            'inventario_d' => (float) ($detalle->inventario_d ?? 0)
                        ];
                    })->values()->toArray();

                    return [
                        'id' => $producto->id,
                        'id_articulo' => $producto->id,
                        'title' => $producto->descripcion,
                        'description' => $producto->descripcion,
                        'price' => $finalPrice,
                        'originalPrice' => $originalPrice,
                        'discount' => $discountPercentage,
                        'image' => $this->getProductImageUrl($producto->id, $producto->imagen),
                        'brand' => $producto->marca ?? 'Sin marca',
                        'stock' => $inventarioTotal,
                        'inventario' => $inventarioTotal,
                        'colors' => $colors,
                        'sizes' => $sizes,
                        'isNew' => $isNew,
                        'rating' => $rating,
                        'ratingCount' => $ratingCount,
                        'id_linea' => $producto->id_linea,
                        'category_id' => $producto->id_linea,
                        'catalogoId' => $producto->catalogoId,
                        'fecha_alta' => $producto->fecha_alta ? date('Y-m-d', strtotime($producto->fecha_alta)) : null,
                        'opc_nuevo' => $producto->opc_nuevo ?? 'N',
                        'opc_promo' => $producto->opc_promo ?? 'N',
                        'desc_promo' => $descPromoValue,
                        'stock_received_count' => (int) ($producto->stock_received_count ?? 0),
                        'detalles' => $detalles
                    ];
                })
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $productos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener productos sugeridos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Igual que resources/js/utils/productUtils.js getTotalInventoryFromProduct (lista próximamente).
     *
     * @param \Illuminate\Support\Collection<int, object> $productGroup Filas del join agrupadas por producto
     */
    private function computeTotalInventoryLikeFrontend($productGroup, object $producto): float
    {
        $detailRows = $productGroup->filter(function ($row) {
            return isset($row->detalle_id) && $row->detalle_id !== null;
        });

        if ($detailRows->isNotEmpty()) {
            return (float) $detailRows->sum(function ($row) {
                return Producto::effectiveDetailInventoryContribution($row->inventario_d ?? null);
            });
        }

        return Producto::effectiveDetailInventoryContribution($producto->inventario ?? 0);
    }

    /**
     * Generar URL de imagen del producto desde S3
     * Formato: https://cherry-fotos.s3.amazonaws.com/shopify/{productId}/{productId}_1.jpg
     * @param string|int $productId - ID del producto
     * @param string|null $imagenFromDb - Parámetro ignorado (mantenido para compatibilidad)
     * @return string URL de la imagen
     */
    private function getProductImageUrl($productId, $imagenFromDb = null)
    {
        // Si no hay productId, devolver placeholder
        if (!$productId) {
            return asset('images/placeholder-product.png');
        }

        // Convertir a string para manejar correctamente
        $productIdStr = trim((string) $productId);
        
        // Siempre generar URL de S3 basada en el ID del producto
        // Formato: https://cherry-fotos.s3.amazonaws.com/shopify/{productId}/{productId}_1.jpg
        return "https://cherry-fotos.s3.amazonaws.com/shopify/{$productIdStr}/{$productIdStr}_1.jpg";
    }

    /**
     * Mapa id → fecha_agotado (Y-m-d o null) para filtrar en cliente catálogo externo.
     */
    public function fechaAgotadoMeta(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        if (! is_array($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'ids debe ser un arreglo',
            ], 422);
        }

        $ids = array_values(array_unique(array_filter(array_map('strval', $ids))));
        if (count($ids) > 800) {
            return response()->json([
                'success' => false,
                'message' => 'Máximo 800 ids por solicitud',
            ], 422);
        }

        if (count($ids) === 0) {
            return response()->json([
                'success' => true,
                'data' => new \stdClass(),
            ]);
        }

        $rows = DB::table('productos')
            ->whereIn('id', $ids)
            ->select(['id', 'fecha_agotado'])
            ->get();

        $data = [];
        foreach ($rows as $r) {
            $data[$r->id] = $r->fecha_agotado ? date('Y-m-d', strtotime((string) $r->fecha_agotado)) : null;
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}

