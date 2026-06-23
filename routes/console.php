<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Correos automáticos Cherry (requiere `php artisan schedule:run` en cron).
| Carrito abandonado: cada 15 min (1 h, 24 h, 36 h). Estatus de envío: cada hora.
*/
Schedule::command('mail:abandoned-cart')->everyFifteenMinutes();
Schedule::command('mail:order-status-update')->hourly();
Schedule::command('users:degrade-expired-seller-categories')->daily();