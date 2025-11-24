<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductSyncController;

// Ruta principal para la PWA
Route::get('/', function () {
    return view('app');
});

// Ruta para sincronizar productos desde API externa (sin autenticación, para cronjob)
// IMPORTANTE: Debe estar ANTES de la ruta catch-all /{any}
Route::get('/products/sync', [ProductSyncController::class, 'sync']);

// Ruta para todas las demás páginas (SPA)
// Excluir /products/sync de la ruta catch-all
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!products/sync).*');
