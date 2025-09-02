<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use App\Models\Favorite;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TestFavoritesApi extends Command
{
    protected $signature = 'app:test-favorites-api';
    protected $description = 'Test favorites API functionality and diagnose issues';

    public function handle()
    {
        $this->info('🔍 Testing Favorites API Functionality...');
        
        // 1. Verificar tabla favorites
        $this->info("\n1. Verificando tabla favorites...");
        if (Schema::hasTable('favorites')) {
            $this->info('✅ Tabla favorites existe');
            
            $columns = Schema::getColumnListing('favorites');
            $this->info('📋 Columnas: ' . implode(', ', $columns));
            
            $count = Favorite::count();
            $this->info("📊 Total de favoritos: {$count}");
        } else {
            $this->error('❌ Tabla favorites NO existe');
            return 1;
        }
        
        // 2. Verificar usuarios
        $this->info("\n2. Verificando usuarios...");
        $userCount = User::count();
        $this->info("👥 Total de usuarios: {$userCount}");
        
        if ($userCount > 0) {
            $user = User::first();
            $this->info("👤 Usuario de prueba: {$user->email} (ID: {$user->id})");
            
            // 3. Verificar favoritos del usuario
            $this->info("\n3. Verificando favoritos del usuario...");
            $userFavorites = Favorite::where('user_id', $user->id)->get();
            $this->info("❤️ Favoritos del usuario: {$userFavorites->count()}");
            
            if ($userFavorites->count() > 0) {
                foreach ($userFavorites as $fav) {
                    $this->info("   - Producto ID: {$fav->product_id}, Título: {$fav->product_title}");
                }
            }
        }
        
        // 4. Verificar configuración de autenticación
        $this->info("\n4. Verificando configuración de autenticación...");
        $config = config('auth.guards.api');
        if ($config) {
            $this->info("🔐 Guard API configurado: " . ($config['driver'] ?? 'N/A'));
            $this->info("📝 Provider: " . ($config['provider'] ?? 'N/A'));
        } else {
            $this->warn("⚠️ Guard API no configurado");
        }
        
        // 5. Verificar middleware
        $this->info("\n5. Verificando middleware de autenticación...");
        $middleware = app('router')->getMiddleware();
        if (isset($middleware['auth'])) {
            $this->info("✅ Middleware 'auth' registrado");
        } else {
            $this->warn("⚠️ Middleware 'auth' no registrado");
        }
        
        // 6. Verificar rutas
        $this->info("\n6. Verificando rutas de favoritos...");
        $routes = app('router')->getRoutes();
        $favoritesRoutes = collect($routes)->filter(function ($route) {
            return str_contains($route->uri(), 'favorites');
        });
        
        if ($favoritesRoutes->count() > 0) {
            $this->info("✅ Rutas de favoritos encontradas:");
            foreach ($favoritesRoutes as $route) {
                $middleware = implode(', ', $route->middleware());
                $this->info("   - {$route->methods()[0]} {$route->uri()} [{$middleware}]");
            }
        } else {
            $this->warn("⚠️ No se encontraron rutas de favoritos");
        }
        
        // 7. Verificar conexión a base de datos
        $this->info("\n7. Verificando conexión a base de datos...");
        try {
            DB::connection()->getPdo();
            $this->info("✅ Conexión a BD exitosa");
            $this->info("📊 Base de datos: " . DB::connection()->getDatabaseName());
        } catch (\Exception $e) {
            $this->error("❌ Error de conexión a BD: " . $e->getMessage());
        }
        
        $this->info("\n🎯 Diagnóstico completado. Revisa los resultados arriba.");
        
        return 0;
    }
}
