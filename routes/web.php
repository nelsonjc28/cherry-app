<?php

use App\Models\Cart;
use App\Models\Order;
use App\Models\User;
use App\Services\CartEmailPricingService;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CherryCatalogProxyController;
use App\Http\Controllers\Api\ProductSyncController;
use App\Http\Controllers\MailPublicAssetController;

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

    Route::get('/dev/mail-preview/welcome/{user?}', function (?User $user = null) {
        $user = $user ?? User::query()->first();
        if (! $user) {
            abort(404, 'No hay usuarios en la base de datos. Crea uno o pasa el ID: /dev/mail-preview/welcome/1');
        }
        $html = (new \App\Mail\WelcomeEmail($user))->render();

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    })->name('dev.mail.welcome');

    Route::get('/dev/mail-preview/abandoned-cart/{cart?}', function (?Cart $cart = null) {
        $user = User::query()->first();
        if (! $user) {
            abort(404, 'No hay usuarios en la base de datos.');
        }
        if ($cart === null) {
            $cart = Cart::query()->where('total_items', '>', 0)->whereNotNull('items')->with('user')->first();
        }
        if ($cart === null) {
            $cart = new Cart([
                'user_id' => $user->id,
                'items' => [
                    [
                        'title' => 'Producto de ejemplo',
                        'quantity' => 2,
                        'precio' => 1500,
                        'id_articulo' => '',
                        'desc_promo' => 0,
                    ],
                ],
                'total_items' => 2,
            ]);
            $cart->setRelation('user', $user);
        } else {
            $user = $cart->user ?? $user;
        }
        $items = is_array($cart->items) ? $cart->items : [];
        $preview = CartEmailPricingService::buildPreview($items, $user->seller_category ?? 'bronce');
        if (count($preview['lines']) === 0) {
            $preview = CartEmailPricingService::buildPreview([
                [
                    'title' => 'Producto de ejemplo',
                    'quantity' => 1,
                    'precio' => 1500,
                    'id_articulo' => '',
                    'desc_promo' => 0,
                ],
            ], $user->seller_category ?? 'bronce');
        }
        $html = (new \App\Mail\AbandonedCartEmail($user, $cart, $preview))->render();

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    })->name('dev.mail.abandoned-cart');
}

/*
| Imágenes de correo en public/mail-assets/ (servidas como estáticas).
| Si el archivo no existe y la petición llega a Laravel, devolvemos 404 (no HTML de la SPA).
*/
Route::get('/mail-assets/{filename}', [MailPublicAssetController::class, 'show'])
    ->where('filename', '[^/]+')
    ->name('mail-assets.file');

// Mismo origen: el navegador pega a /cherry-api/*; Laravel hace de proxy hacia el catálogo (evita CORS en local).
Route::any('cherry-api', CherryCatalogProxyController::class);
Route::any('cherry-api/{path}', CherryCatalogProxyController::class)->where('path', '.*');

// Ruta para todas las demás páginas (SPA)
// Excluir rutas backend (/api/*), mail-assets y utilitarias.
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!(api/|cherry-api|mail-assets/|products/(sync|replace-all))).*');
