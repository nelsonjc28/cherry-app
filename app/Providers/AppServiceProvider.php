<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Intentar aumentar los límites de upload (puede no funcionar si está deshabilitado en php.ini)
        // Nota: upload_max_filesize y post_max_size generalmente NO se pueden cambiar con ini_set()
        // porque PHP los lee antes de ejecutar el código. Estos valores deben configurarse en php.ini
        @ini_set('upload_max_filesize', '100M');
        @ini_set('post_max_size', '100M');
        @ini_set('max_execution_time', '300');
        @ini_set('max_input_time', '300');
        @ini_set('memory_limit', '512M');
    }
}
