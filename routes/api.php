<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminOrderedCategoryController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\WelcomeSectionController;
use App\Http\Controllers\Api\AdminWelcomeSectionController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');
Route::get('/debug', [AuthController::class, 'debug'])->middleware('auth:api');

// Admin routes - require authentication and admin role
Route::middleware(['auth:api'])->group(function () {
    Route::get('/admin/users', [AdminController::class, 'getUsers']);
    Route::get('/admin/users/{id}', [AdminController::class, 'getUser']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::put('/admin/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);
    Route::get('/admin/roles', [AdminController::class, 'getRoles']);
    
    // Client routes - require authentication and admin role
    Route::get('/admin/clients', [ClientController::class, 'getClients']);
    Route::get('/admin/clients/{id}', [ClientController::class, 'getClient']);
    Route::post('/admin/clients', [ClientController::class, 'createClient']);
    Route::put('/admin/clients/{id}', [ClientController::class, 'updateClient']);
    Route::delete('/admin/clients/{id}', [ClientController::class, 'deleteClient']);
    
    // Category routes - require authentication and admin role
    Route::get('/admin/categories', [AdminCategoryController::class, 'index']);
    Route::get('/admin/categories/{id}', [AdminCategoryController::class, 'show']);
    Route::post('/admin/categories', [AdminCategoryController::class, 'store']);
    Route::put('/admin/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/admin/categories/{id}', [AdminCategoryController::class, 'destroy']);
    
    // Ordered Categories routes - require authentication and admin role
    Route::get('/admin/ordered-categories', [AdminOrderedCategoryController::class, 'index']);
    Route::post('/admin/ordered-categories/update-order', [AdminOrderedCategoryController::class, 'updateOrder']);
    Route::delete('/admin/ordered-categories/clear', [AdminOrderedCategoryController::class, 'clearOrder']);
    
    // Welcome Sections routes - require authentication and admin role
    Route::middleware(['auth:api', 'admin'])->group(function () {
        Route::get('/admin/welcome-sections', [AdminWelcomeSectionController::class, 'index']);
        Route::get('/admin/welcome-sections/{id}', [AdminWelcomeSectionController::class, 'show']);
        Route::post('/admin/welcome-sections', [AdminWelcomeSectionController::class, 'store']);
        Route::post('/admin/welcome-sections/{id}', [AdminWelcomeSectionController::class, 'update']);
        Route::delete('/admin/welcome-sections/{id}', [AdminWelcomeSectionController::class, 'destroy']);
        Route::patch('/admin/welcome-sections/{id}/toggle', [AdminWelcomeSectionController::class, 'toggleStatus']);
    });
    
    // Favorites routes
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::post('/favorites/check', [FavoriteController::class, 'check']);
    Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);
    Route::delete('/favorites', [FavoriteController::class, 'destroy']);
    
    // Ratings routes
    Route::get('/ratings/user', [RatingController::class, 'getUserRating']);
    Route::post('/ratings', [RatingController::class, 'store']);
    Route::post('/ratings/check', [RatingController::class, 'checkUserRating']);
});

// Public ratings routes (no authentication required)
Route::get('/ratings/product', [RatingController::class, 'getProductRatings']);
Route::post('/ratings/bulk', [RatingController::class, 'getBulkRatings']);

// Public categories routes (no authentication required)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);

// Public welcome sections routes (no authentication required)
Route::get('/welcome-sections/active', [WelcomeSectionController::class, 'getActiveSection']);
Route::get('/welcome-sections', [WelcomeSectionController::class, 'getActiveSections']);

// Public home categories route (no authentication required)
Route::get('/home-categories', [AdminOrderedCategoryController::class, 'getHomeCategories']); 