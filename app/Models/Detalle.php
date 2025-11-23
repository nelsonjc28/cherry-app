<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Detalle extends Model
{
    protected $table = 'detalles';
    
    public $incrementing = false;
    protected $keyType = 'integer';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'id',
        'producto_id',
        'art_empresa',
        'modelo',
        'detalle',
        'codbarra',
        'ean',
        'sku',
        'color_file',
        'opc_web',
        'orden',
        'inventario_d',
        'idShopify',
        'nombreColor',
        'fechaMovimiento'
    ];

    protected $casts = [
        'fechaMovimiento' => 'date',
        'inventario_d' => 'decimal:2',
    ];

    /**
     * Relación con producto
     */
    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class, 'producto_id', 'id');
    }
}
