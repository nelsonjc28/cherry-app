<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderExternalApiLog extends Model
{
    protected $fillable = [
        'order_id',
        'http_status',
        'estado',
        'respuesta_api',
        'origen',
        'ejecutado_at',
    ];

    protected $casts = [
        'ejecutado_at' => 'datetime',
        'http_status' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
