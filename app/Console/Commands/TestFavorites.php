<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Favorite;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class TestFavorites extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-favorites';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test favorites functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Favorites Functionality...');
        
        // Verificar si la tabla existe
        if (Schema::hasTable('favorites')) {
            $this->info('✓ Tabla favorites existe');
        } else {
            $this->error('✗ Tabla favorites NO existe');
            return;
        }
        
        // Verificar estructura de la tabla
        $columns = Schema::getColumnListing('favorites');
        $this->info('Columnas en tabla favorites: ' . implode(', ', $columns));
        
        // Contar favoritos existentes
        $count = Favorite::count();
        $this->info("Total de favoritos en la base de datos: {$count}");
        
        // Mostrar algunos favoritos si existen
        if ($count > 0) {
            $favorites = Favorite::take(5)->get();
            $this->info('Primeros 5 favoritos:');
            foreach ($favorites as $fav) {
                $this->line("- ID: {$fav->id}, User: {$fav->user_id}, Product: {$fav->product_id}");
            }
        }
        
        // Verificar usuarios existentes
        $userCount = User::count();
        $this->info("Total de usuarios en la base de datos: {$userCount}");
        
        if ($userCount > 0) {
            $user = User::first();
            $this->info("Usuario de prueba: ID {$user->id}, Email: {$user->email}");
            
            // Intentar crear un favorito de prueba
            try {
                $favorite = Favorite::create([
                    'user_id' => $user->id,
                    'product_id' => 'test_product_123',
                    'product_title' => 'Producto de Prueba',
                    'product_image' => 'test_image.jpg',
                    'product_price' => 99.99
                ]);
                
                $this->info("✓ Favorito de prueba creado con ID: {$favorite->id}");
                
                // Verificar que se puede recuperar
                $retrieved = Favorite::where('user_id', $user->id)->first();
                if ($retrieved) {
                    $this->info("✓ Favorito recuperado correctamente: {$retrieved->product_title}");
                } else {
                    $this->error("✗ No se pudo recuperar el favorito");
                }
                
                // Limpiar favorito de prueba
                $favorite->delete();
                $this->info("✓ Favorito de prueba eliminado");
                
            } catch (\Exception $e) {
                $this->error("✗ Error al crear favorito de prueba: " . $e->getMessage());
            }
        }
        
        $this->info('Test completado.');
    }
}
