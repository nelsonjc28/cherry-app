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
use App\Http\Controllers\Api\ContactInfoController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PrivacyPolicyController;
use App\Http\Controllers\Api\AdminCatalogController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');
Route::get('/debug', [AuthController::class, 'debug'])->middleware('auth:api');

// Profile routes - require authentication
Route::middleware(['auth:api'])->group(function () {
    Route::put('/profile/update', [ProfileController::class, 'update']);
    

});

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
    Route::middleware(['auth:api', 'admin'])->group(function () {
        Route::get('/admin/categories', [AdminCategoryController::class, 'index']);
        
        // Category Products routes - MUST come before the general {id} route
        Route::get('/admin/categories/category-product-ids', [AdminCategoryController::class, 'getCategoryProductIds']);
        Route::post('/admin/categories/{categoryId}/products', [AdminCategoryController::class, 'addProducts']);
        Route::delete('/admin/categories/{categoryId}/products/{productId}', [AdminCategoryController::class, 'removeProduct']);
        Route::get('/admin/categories/{categoryId}/products', [AdminCategoryController::class, 'getCategoryProducts']);
        Route::post('/admin/categories/{categoryId}/reorder-products', [AdminCategoryController::class, 'reorderProducts']);
        
        // General category routes - MUST come after specific routes
        Route::get('/admin/categories/{id}', [AdminCategoryController::class, 'show']);
        Route::post('/admin/categories', [AdminCategoryController::class, 'store']);
        Route::put('/admin/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('/admin/categories/{id}', [AdminCategoryController::class, 'destroy']);
        Route::patch('/admin/categories/{id}/toggle', [AdminCategoryController::class, 'toggleStatus']);
    });
    
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
    
    // Catalogs routes - require authentication and admin role
    Route::middleware(['auth:api', 'admin'])->group(function () {
        Route::get('/admin/catalogs', [AdminCatalogController::class, 'index']);
        Route::get('/admin/catalogs/catalog-product-ids', [AdminCatalogController::class, 'getCatalogProductIds']);
        Route::post('/admin/catalogs/filter-available-products', [AdminCatalogController::class, 'filterAvailableProducts']);
        Route::get('/admin/catalogs/{id}', [AdminCatalogController::class, 'show']);
        Route::post('/admin/catalogs', [AdminCatalogController::class, 'store']);
        Route::post('/admin/catalogs/{id}', [AdminCatalogController::class, 'update']);
        Route::delete('/admin/catalogs/{id}', [AdminCatalogController::class, 'destroy']);
        Route::patch('/admin/catalogs/{id}/toggle', [AdminCatalogController::class, 'toggleStatus']);
        Route::post('/admin/catalogs/{id}/pdf-images', [AdminCatalogController::class, 'addPdfImages']);
        Route::delete('/admin/catalogs/{catalogId}/pdf-images/{imageId}', [AdminCatalogController::class, 'removePdfImage']);
        Route::post('/admin/catalogs/{id}/products', [AdminCatalogController::class, 'addProducts']);
        Route::delete('/admin/catalogs/{catalogId}/products/{productId}', [AdminCatalogController::class, 'removeProduct']);
        Route::post('/admin/catalogs/{id}/reorder', [AdminCatalogController::class, 'reorder']);
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

// Public contact info routes (no authentication required)
Route::get('/contact-info', [ContactInfoController::class, 'show']);

// Public privacy policy routes (no authentication required)
Route::get('/privacy-policy', [PrivacyPolicyController::class, 'show']);



// Admin contact info routes - require authentication and admin role
Route::middleware(['auth:api', 'admin'])->group(function () {
    Route::put('/admin/contact-info', [ContactInfoController::class, 'update']);
    
    // Admin privacy policy routes
    Route::get('/admin/privacy-policies', [PrivacyPolicyController::class, 'index']);
    Route::post('/admin/privacy-policies', [PrivacyPolicyController::class, 'store']);
    Route::put('/admin/privacy-policies/{id}', [PrivacyPolicyController::class, 'update']);
    Route::delete('/admin/privacy-policies/{id}', [PrivacyPolicyController::class, 'destroy']);
    Route::patch('/admin/privacy-policies/{id}/activate', [PrivacyPolicyController::class, 'activate']);
});

// Public home categories route (no authentication required)
Route::get('/home-categories', [AdminOrderedCategoryController::class, 'getHomeCategories']); 