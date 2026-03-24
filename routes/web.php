<?php

use App\Models\Order;
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

// Vista previa HTML del correo de confirmación (solo entorno local; no envía nada)
if (app()->environment('local')) {
    Route::get('/dev/mail-preview/order-confirmation/{order}', function (Order $order) {
        $order->loadMissing(['user', 'address', 'items.detalleRow']);
        $html = (new \App\Mail\OrderConfirmationMail($order))->render();

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    })->name('dev.mail.order-confirmation');
}

// Ruta para todas las demás páginas (SPA)
// Excluir /products/sync y /products/replace-all de la ruta catch-all
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!products/(sync|replace-all)).*');
