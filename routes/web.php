<?php

use Illuminate\Support\Facades\Route;

// Ruta pública para categorías del menú
Route::get('/api/menu-categories', [App\Http\Controllers\Api\PublicMenuCategoryController::class, 'index']);

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
