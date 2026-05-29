<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CronMailLog extends Model
{
    public const TIPO_ABANDONED_CART = 'abandoned_cart';

    public const TIPO_ORDER_STATUS = 'order_status';

    public const TIPO_RESUMEN = 'resumen_ejecucion';

    public const ESTADO_EXITOSO = 'exitoso';

    public const ESTADO_ERROR = 'error';

    public const ESTADO_OMITIDO = 'omitido';

    protected $fillable = [
        'comando',
        'tipo_correo',
        'estado',
        'user_id',
        'cart_id',
        'order_id',
        'email_destino',
        'mensaje',
        'origen',
        'ejecutado_at',
    ];

    protected $casts = [
        'ejecutado_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
