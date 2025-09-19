<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Catalog;
use App\Models\CatalogPdf;

class CatalogImageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear un catálogo de prueba si no existe
        $catalog = Catalog::firstOrCreate(
            ['name' => 'Catálogo de Prueba'],
            [
                'description' => 'Catálogo de prueba para imágenes',
                'code' => 'TEST-IMG-001',
                'is_active' => true,
                'display_order' => 1
            ]
        );

        // Crear algunas imágenes de prueba
        $sampleImages = [
            [
                'catalog_name' => 'Catálogo Primavera 2024',
                'image_name' => 'portada-primavera.jpg',
                'image_path' => 'catalog-images/sample-1.jpg',
                'image_size' => 1024000,
                'image_mime_type' => 'image/jpeg',
                'image_alt' => 'Portada del catálogo de primavera',
                'width' => 1200,
                'height' => 800,
                'thumbnail_path' => 'catalog-images/thumbnails/thumb_sample-1.jpg',
                'display_order' => 1
            ],
            [
                'catalog_name' => 'Catálogo Primavera 2024',
                'image_name' => 'productos-destacados.jpg',
                'image_path' => 'catalog-images/sample-2.jpg',
                'image_size' => 1500000,
                'image_mime_type' => 'image/jpeg',
                'image_alt' => 'Productos destacados',
                'width' => 1200,
                'height' => 800,
                'thumbnail_path' => 'catalog-images/thumbnails/thumb_sample-2.jpg',
                'display_order' => 2
            ],
            [
                'catalog_name' => 'Catálogo Primavera 2024',
                'image_name' => 'nuevas-tendencias.jpg',
                'image_path' => 'catalog-images/sample-3.jpg',
                'image_size' => 980000,
                'image_mime_type' => 'image/jpeg',
                'image_alt' => 'Nuevas tendencias',
                'width' => 1200,
                'height' => 800,
                'thumbnail_path' => 'catalog-images/thumbnails/thumb_sample-3.jpg',
                'display_order' => 3
            ]
        ];

        foreach ($sampleImages as $imageData) {
            CatalogPdf::create([
                'catalog_id' => $catalog->id,
                ...$imageData
            ]);
        }

        $this->command->info('Imágenes de catálogo creadas exitosamente!');
    }
}