<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    protected $table = 'productos';
    
    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'id_linea',
        'art_empresa',
        'id_provedor',
        'descripcion',
        'marca',
        'tkmov',
        'tipo_venta',
        'iva',
        'costo',
        'precio1',
        'precio2',
        'precio3',
        'precio4',
        'precio5',
        'precio6',
        'precio7',
        'precio8',
        'precio9',
        'precio10',
        'stockmin',
        'stockmax',
        'piezas',
        'proporcion',
        'sku',
        'ean',
        'composicion',
        'notas',
        'imagen',
        'fecha_alta',
        'fecha_compra',
        'activo',
        'bandvend',
        'presel',
        'tipoa',
        'proma',
        'promt',
        'promr',
        'id_molde',
        'precio_dll',
        'origen',
        'precio_porcen1',
        'precio_porcen2',
        'precio_porcen3',
        'precio_porcen4',
        'especificaciones',
        'bom',
        'opc_expl',
        'id_sublinea',
        'nombre_artd',
        'caja_med',
        'caja_peso',
        'id_impresion',
        'medidas_art',
        'medidas_imp',
        'opc_desc',
        'precio_mar',
        'arancel',
        'ancho_articulo',
        'alto_articulo',
        'ancho_caja',
        'largo_caja',
        'alto_caja',
        'fob_china',
        'costo_aduana',
        'opc_web',
        'url_video',
        'id_articulo2',
        'opc_nuevo',
        'opc_promo',
        'desc_promo',
        'opc_tinta_azul',
        'segunda_linea',
        'id_prod',
        'id_uni',
        'costo_r',
        'imagen_esq',
        'tipoart',
        'precio_alto',
        'precio_anterior',
        'costo_rmb',
        'costo_tentativo',
        'costo_promedio',
        'familia',
        'familia_1',
        'familia_2',
        'familia_3',
        'familia_4',
        'familia_5',
        'familia_6',
        'familia_7',
        'cod_color',
        'codbarra',
        'codigo_prv',
        'i_raiz',
        'ict',
        'campo_info_prv',
        'unidad',
        'tipo_empaque',
        'temporada',
        'opc_catalogo',
        'catalogoId',
        'genero_id',
        'sector_id',
        'fechaAct',
        'opcinsert',
        'cantidad',
        'inventario',
        'stock_received_count',
        'idTienda',
        'descuento'
    ];

    protected $casts = [
        'fecha_alta' => 'date',
        'fecha_compra' => 'date',
        'costo' => 'decimal:2',
        'precio1' => 'decimal:2',
        'precio2' => 'decimal:2',
        'precio3' => 'decimal:2',
        'precio4' => 'decimal:2',
        'precio5' => 'decimal:2',
        'precio6' => 'decimal:2',
        'precio7' => 'decimal:2',
        'precio8' => 'decimal:2',
        'precio9' => 'decimal:2',
        'precio10' => 'decimal:2',
        'proma' => 'decimal:2',
        'promt' => 'decimal:2',
        'promr' => 'decimal:2',
        'precio_dll' => 'decimal:2',
        'precio_porcen1' => 'decimal:2',
        'precio_porcen2' => 'decimal:2',
        'precio_porcen3' => 'decimal:2',
        'precio_porcen4' => 'decimal:2',
        'precio_mar' => 'decimal:2',
        'arancel' => 'decimal:2',
        'ancho_articulo' => 'decimal:2',
        'alto_articulo' => 'decimal:2',
        'ancho_caja' => 'decimal:2',
        'largo_caja' => 'decimal:2',
        'alto_caja' => 'decimal:2',
        'fob_china' => 'decimal:2',
        'costo_aduana' => 'decimal:2',
        'desc_promo' => 'decimal:2',
        'costo_r' => 'decimal:2',
        'precio_alto' => 'decimal:2',
        'precio_anterior' => 'decimal:2',
        'costo_rmb' => 'decimal:2',
        'costo_tentativo' => 'decimal:2',
        'costo_promedio' => 'decimal:2',
        'cantidad' => 'decimal:2',
        'inventario' => 'decimal:2',
        'descuento' => 'decimal:2',
        'stock_received_count' => 'integer',
    ];

    /**
     * Relación con género
     */
    public function genero(): BelongsTo
    {
        return $this->belongsTo(Genero::class, 'genero_id');
    }

    /**
     * Relación con sector
     */
    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class, 'sector_id');
    }

    /**
     * Relación con detalles
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(Detalle::class, 'producto_id', 'id');
    }

    /**
     * Relación con reseñas
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'product_id', 'id');
    }

    public function productNotifications(): HasMany
    {
        return $this->hasMany(ProductNotification::class, 'producto_id', 'id');
    }

    /**
     * Oferta por desc_promo (valor numérico > 0). Si aplica, el producto no debe tratarse como "Próximamente".
     */
    public function hasActiveDescPromoOffer(): bool
    {
        $raw = $this->attributes['desc_promo'] ?? null;
        if ($raw === null || $raw === '') {
            return false;
        }

        return (float) $raw > 0.00001;
    }

    /**
     * Contribución de una talla al stock total: inventario_d negativo no resta (no cuenta).
     * Alineado con getTotalInventoryFromProduct (resources/js/utils/productUtils.js).
     */
    public static function effectiveDetailInventoryContribution(mixed $raw): float
    {
        $n = (float) ($raw ?? 0);

        return $n > 0.0000001 ? $n : 0.0;
    }

    /**
     * Inventario total: suma de detalles si están cargados; si no, campo inventario/piezas.
     * Por talla solo se suman cantidades > 0 en inventario_d.
     */
    public function computeTotalInventoryQuantity(): float
    {
        if ($this->relationLoaded('detalles') && $this->detalles->isNotEmpty()) {
            return (float) $this->detalles->sum(fn ($d) => self::effectiveDetailInventoryContribution($d->inventario_d ?? null));
        }

        return self::effectiveDetailInventoryContribution($this->inventario ?? $this->piezas ?? 0);
    }

    /**
     * Inventario por talla antes de aplicar un payload de sincronización (id detalle => cantidad).
     *
     * @return array<string, float>
     */
    public static function snapshotInventoryByDetalleIdForProduct(string $productoId): array
    {
        return Detalle::query()
            ->where('producto_id', $productoId)
            ->get()
            ->mapWithKeys(fn (Detalle $d) => [(string) $d->id => (float) ($d->inventario_d ?? 0)])
            ->all();
    }

    /**
     * Tras aplicar sync: incrementa stock_received_count en 1 si la suma de inventario_d cambió respecto al snapshot.
     * - Sube o baja el stock: +1 siempre que el total final sea ≥ 0 y no sea el mismo total (epsilon).
     * - Si el total final es menor que 0: no se toca el contador (ni sube ni baja).
     * - Si antes y después son ≤ 0 (ambos lados): no se toca el contador.
     */
    public static function incrementStockReceivedWhenTotalPiecesIncreasedAfterSync(self $producto, array $previousInventoryByDetalleId): bool
    {
        $beforeTotal = (float) array_sum($previousInventoryByDetalleId);

        $afterTotal = (float) Detalle::query()
            ->where('producto_id', $producto->id)
            ->sum('inventario_d');

        if ($afterTotal < 0) {
            return false;
        }

        if ($beforeTotal <= 0 && $afterTotal <= 0) {
            return false;
        }

        if (abs($afterTotal - $beforeTotal) <= 0.00001) {
            return false;
        }

        $producto->increment('stock_received_count');

        return true;
    }

    /**
     * Próximamente: candidato por año + sin stock + sin recepciones previas, y SIN oferta desc_promo.
     * Además: (fecha_alta es null o stock total <= 0), alineado con reglas de negocio y listados.
     */
    public function getIsComingSoonAttribute(): bool
    {
        if ($this->hasActiveDescPromoOffer()) {
            return false;
        }

        $total = $this->computeTotalInventoryQuantity();
        if ($total > 0.00001) {
            return false;
        }

        if ((int) ($this->stock_received_count ?? 0) > 0) {
            return false;
        }

        $idStr = (string) $this->getKey();
        if (strlen($idStr) < 3) {
            return false;
        }

        return (int) $idStr[2] === ((int) date('Y') % 10);
    }

    /**
     * Misma lógica que {@see getIsComingSoonAttribute()} para filas stdClass/array (ProductController con DB::table).
     *
     * @param  object|array<string, mixed>  $row
     */
    public static function evaluateIsComingSoonFromRow(object|array $row, float $inventoryTotal): bool
    {
        $desc = (float) (is_array($row) ? ($row['desc_promo'] ?? 0) : ($row->desc_promo ?? 0));
        if ($desc > 0.00001) {
            return false;
        }

        if ($inventoryTotal > 0.00001) {
            return false;
        }

        $idStr = (string) (is_array($row) ? ($row['id'] ?? '') : ($row->id ?? ''));
        if (strlen($idStr) < 3) {
            return false;
        }

        if ((int) $idStr[2] !== ((int) date('Y') % 10)) {
            return false;
        }

        $received = (int) (is_array($row) ? ($row['stock_received_count'] ?? 0) : ($row->stock_received_count ?? 0));
        if ($received > 0) {
            return false;
        }

        return true;
    }

    /**
     * Filtro SQL para listados "Próximamente": sin oferta activa en desc_promo.
     *
     * @param  Builder<\App\Models\Producto>  $query
     * @return Builder<\App\Models\Producto>
     */
    public function scopeWithoutActiveDescPromo(Builder $query): Builder
    {
        return $query->where(function (Builder $w) {
            $w->whereNull('desc_promo')
                ->orWhere('desc_promo', '<=', 0);
        });
    }
}
