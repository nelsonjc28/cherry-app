<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Correos automáticos Cherry (requiere `php artisan schedule:run` en cron).
| Carrito abandonado: diario. Estatus de envío: cada hora.
*/
Schedule::command('mail:abandoned-cart')->daily();
Schedule::command('mail:order-status-update')->hourly();
