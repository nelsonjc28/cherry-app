<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

    /**
     * Reduce el stock (inventario_d) de un detalle (talla/color) al registrar un pedido.
     * Piso 0: el stock nunca queda negativo.
     *
     * Se ejecuta dentro de la transacción de creación de la orden, así que si el
     * pedido falla, el rollback revierte este descuento.
     */
    public static function decrementStock(int $detalleId, int $qty): void
    {
        if ($qty <= 0 || $detalleId <= 0) {
            return;
        }

        try {
            $affected = DB::table('detalles')
                ->where('id', $detalleId)
                ->update([
                    'inventario_d' => DB::raw('GREATEST(0, IFNULL(inventario_d, 0) - '.(int) $qty.')'),
                ]);

            if ($affected > 0) {
                $newStock = (float) DB::table('detalles')->where('id', $detalleId)->value('inventario_d');
                Log::info('Stock reducido al registrar pedido', [
                    'detalle_id' => $detalleId,
                    'qty' => $qty,
                    'nuevo_stock' => $newStock,
                ]);
            } else {
                Log::warning('No se encontró detalle para reducir stock (ignorado, no bloquea el pedido)', [
                    'detalle_id' => $detalleId,
                    'qty' => $qty,
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('No se pudo reducir stock del detalle (no bloquea el pedido)', [
                'detalle_id' => $detalleId,
                'qty' => $qty,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
