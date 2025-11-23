<?php

namespace App\Models;

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
        'idTienda',
        'descuento'
    ];

    protected $casts = [
        'fecha_alta' => 'date',
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
