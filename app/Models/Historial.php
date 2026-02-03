<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Historial extends Model
{
    protected $fillable = [
        'ejecutado_at',
        'estado',
        'mensaje',
    ];

    protected $casts = [
        'ejecutado_at' => 'datetime',
    ];
}
