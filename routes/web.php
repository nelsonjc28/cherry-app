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
Route::get('/products/replace-all', [ProductSyncController::class, 'replaceAll']);

// Ruta para imprimir orden (acepta token como parámetro para evitar redirección a login)
Route::get('/api/orders/{orderId}/print', [\App\Http\Controllers\PaymentController::class, 'printOrder']);

// Ruta para todas las demás páginas (SPA)
// Excluir /products/sync y /products/replace-all de la ruta catch-all
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!products/(sync|replace-all)).*');
