<?php

use Illuminate\Support\Facades\Route;

// Ruta principal para la PWA
Route::get('/', function () {
    return view('app');
});

// Ruta para todas las demás páginas (SPA)
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
