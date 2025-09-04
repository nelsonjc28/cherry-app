<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Catalog;

class CheckCatalogImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'catalog:check-images';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check catalog images and their URLs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Verificando imágenes de catálogos...');
        
        $catalogs = Catalog::all();
        $this->info("Total catálogos encontrados: {$catalogs->count()}");
        
        foreach ($catalogs as $catalog) {
            $this->line("---");
            $this->line("Catálogo: {$catalog->name}");
            $this->line("Imagen original: {$catalog->image}");
            $this->line("URL generada: {$catalog->image_url}");
            
            // Verificar si el archivo existe
            if ($catalog->image) {
                $imagePath = public_path($catalog->image);
                if (file_exists($imagePath)) {
                    $this->info("✓ Archivo existe: {$imagePath}");
                } else {
                    $this->error("✗ Archivo NO existe: {$imagePath}");
                }
            } else {
                $this->warn("Sin imagen asignada");
            }
        }
        
        $this->info("Verificación completada.");
    }
}