<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminOrderedCategoryController;
use App\Http\Controllers\Api\HomeCategoryController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\WelcomeSectionController;
use App\Http\Controllers\Api\AdminWelcomeSectionController;
use App\Http\Controllers\Api\ContactInfoController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PrivacyPolicyController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminCatalogOfferController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\PaymentCardController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:api');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:api');
Route::get('/debug', [AuthController::class, 'debug'])->middleware('auth:api');

// Profile routes - require authentication
Route::middleware(['auth:api'])->group(function () {
    Route::post('/profile/update', [ProfileController::class, 'update']);
    
    // Address routes
    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::get('/addresses/{id}', [AddressController::class, 'show']);
    Route::post('/addresses/{id}', [AddressController::class, 'update']);
    Route::delete('/addresses/{id}', [AddressController::class, 'destroy']);
    Route::patch('/addresses/{id}/set-default', [AddressController::class, 'setDefault']);
    
    // Payment Card routes
    Route::get('/payment-cards', [PaymentCardController::class, 'index']);
    Route::post('/payment-cards', [PaymentCardController::class, 'store']);
    Route::get('/payment-cards/{id}', [PaymentCardController::class, 'show']);
    Route::post('/payment-cards/{id}', [PaymentCardController::class, 'update']);
    Route::delete('/payment-cards/{id}', [PaymentCardController::class, 'destroy']);
    Route::patch('/payment-cards/{id}/set-default', [PaymentCardController::class, 'setDefault']);
    
    // Profile routes
    Route::get('/profile', [ProfileController::class, 'show']);

});

// Admin routes - require authentication and admin role
Route::middleware(['auth:api'])->group(function () {
    Route::get('/admin/users', [AdminController::class, 'getUsers']);
    Route::get('/admin/users/{id}', [AdminController::class, 'getUser']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::post('/admin/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);
    Route::get('/admin/roles', [AdminController::class, 'getRoles']);
    
    // Client routes - require authentication and admin role
    Route::get('/admin/clients', [ClientController::class, 'getClients']);
    Route::get('/admin/clients/{id}', [ClientController::class, 'getClient']);
    Route::post('/admin/clients', [ClientController::class, 'createClient']);
    Route::post('/admin/clients/{id}', [ClientController::class, 'updateClient']);
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
        Route::post('/admin/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::delete('/admin/categories/{id}', [AdminCategoryController::class, 'destroy']);
        Route::patch('/admin/categories/{id}/toggle', [AdminCategoryController::class, 'toggleStatus']);
        Route::get('/admin/categories/{id}/available-external-products', [App\Http\Controllers\Api\ExternalProductController::class, 'getAvailableProductsForCategory']);
    });
    
    // Ordered Categories routes - require authentication and admin role
    Route::get('/admin/ordered-categories', [AdminOrderedCategoryController::class, 'index']);
    Route::post('/admin/ordered-categories/update-order', [AdminOrderedCategoryController::class, 'updateOrder']);
    Route::delete('/admin/ordered-categories/clear', [AdminOrderedCategoryController::class, 'clearOrder']);
    
    // Menu Categories routes - require authentication and admin role
    Route::get('/admin/menu-categories', [App\Http\Controllers\Api\AdminMenuCategoryController::class, 'index']);
    Route::post('/admin/menu-categories', [App\Http\Controllers\Api\AdminMenuCategoryController::class, 'store']);
    Route::post('/admin/menu-categories/update-order', [App\Http\Controllers\Api\AdminMenuCategoryController::class, 'updateOrder']);
    Route::delete('/admin/menu-categories/{id}', [App\Http\Controllers\Api\AdminMenuCategoryController::class, 'destroy']);
    Route::get('/admin/menu-categories/available', [App\Http\Controllers\Api\AdminMenuCategoryController::class, 'getAvailableCategories']);
    

    

    
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
        Route::post('/admin/catalogs/{id}/pdfs', [AdminCatalogController::class, 'addPdfs']);
Route::delete('/admin/catalogs/{catalogId}/pdfs/{pdfId}', [AdminCatalogController::class, 'removePdf']);
        Route::post('/admin/catalogs/{id}/products', [AdminCatalogController::class, 'addProducts']);
        Route::get('/admin/catalogs/{id}/products', [AdminCatalogController::class, 'getCatalogProducts']);
        Route::delete('/admin/catalogs/{catalogId}/products/{productId}', [AdminCatalogController::class, 'removeProduct']);
        Route::post('/admin/catalogs/{id}/reorder', [AdminCatalogController::class, 'reorder']);
        Route::patch('/admin/catalogs/{id}/order', [AdminCatalogController::class, 'updateOrder']);
        
        // Catalog Offers routes - require authentication and admin role
        Route::get('/admin/catalog-offers', [AdminCatalogOfferController::class, 'index']);
        Route::get('/admin/catalog-offers/{id}', [AdminCatalogOfferController::class, 'show']);
        Route::post('/admin/catalog-offers', [AdminCatalogOfferController::class, 'store']);
        Route::post('/admin/catalog-offers/{id}', [AdminCatalogOfferController::class, 'update']);
        Route::delete('/admin/catalog-offers/{id}', [AdminCatalogOfferController::class, 'destroy']);
        Route::patch('/admin/catalog-offers/{id}/toggle', [AdminCatalogOfferController::class, 'toggleStatus']);
        Route::post('/admin/catalog-offers/reorder', [AdminCatalogOfferController::class, 'reorder']);
        Route::get('/admin/catalogs/{catalogId}/offers', [AdminCatalogOfferController::class, 'getOffersByCatalog']);
    });
    
    // Favorites routes - require authentication
    Route::middleware(['auth:api'])->group(function () {
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites', [FavoriteController::class, 'store']);
        Route::post('/favorites/check', [FavoriteController::class, 'check']);
        Route::post('/favorites/toggle', [FavoriteController::class, 'toggle']);
        Route::delete('/favorites', [FavoriteController::class, 'destroy']);
    });
    
    // Ratings routes - require authentication (user ratings)
    Route::middleware(['auth:api'])->group(function () {
        Route::get('/ratings/user', [RatingController::class, 'getUserRating']);
        Route::post('/ratings', [RatingController::class, 'store']);
        Route::post('/ratings/check', [RatingController::class, 'checkUserRating']);
    });
});

// Public ratings routes (no authentication required)
Route::get('/ratings/product', [RatingController::class, 'getProductRatings']);
Route::post('/ratings/bulk', [RatingController::class, 'getBulkRatings']);

// Public categories routes (no authentication required)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);
Route::get('/categories/{slug}/products', [CategoryController::class, 'getCategoryProducts']);

// External products routes (no authentication required)
Route::get('/external-products/category/{categoryCode}', [App\Http\Controllers\Api\ExternalProductController::class, 'getProductsByCategoryCode']);
Route::post('/products/ratings', [App\Http\Controllers\Api\RatingController::class, 'getMultipleProductsRatings']);

// Public welcome sections routes (no authentication required)
Route::get('/welcome-sections/active', [WelcomeSectionController::class, 'getActiveSection']);
Route::get('/welcome-sections', [WelcomeSectionController::class, 'getActiveSections']);

// Public contact info routes (no authentication required)
Route::get('/contact-info', [ContactInfoController::class, 'show']);

// Public privacy policy routes (no authentication required)
Route::get('/privacy-policy', [PrivacyPolicyController::class, 'show']);



// Admin contact info routes - require authentication and admin role
Route::middleware(['auth:api', 'admin'])->group(function () {
    Route::post('/admin/contact-info', [ContactInfoController::class, 'update']);
    
    // Admin privacy policy routes
    Route::get('/admin/privacy-policies', [PrivacyPolicyController::class, 'index']);
    Route::post('/admin/privacy-policies', [PrivacyPolicyController::class, 'store']);
    Route::post('/admin/privacy-policies/{id}', [PrivacyPolicyController::class, 'update']);
    Route::delete('/admin/privacy-policies/{id}', [PrivacyPolicyController::class, 'destroy']);
    Route::patch('/admin/privacy-policies/{id}/activate', [PrivacyPolicyController::class, 'activate']);
});

// Public home categories route (no authentication required)
Route::get('/home-categories', [HomeCategoryController::class, 'getHomeCategories']);

// Public home catalogs route (no authentication required)
Route::get('/home-catalogs', [App\Http\Controllers\Api\HomeCatalogController::class, 'index']);
Route::get('/home-catalogs/{id}', [App\Http\Controllers\Api\HomeCatalogController::class, 'show']);

// Public catalogs routes (no authentication required)
Route::get('/catalogs', [AdminCatalogController::class, 'getPublicCatalogs']);
Route::get('/catalogs/{id}', [AdminCatalogController::class, 'getPublicCatalog']);
Route::get('/catalogs/{id}/products', [AdminCatalogController::class, 'getPublicCatalogProducts']);

// Public catalog PDFs routes (no authentication required)
Route::get('/catalogs/{id}/pdfs', [AdminCatalogController::class, 'getPublicCatalogPdfs']); 