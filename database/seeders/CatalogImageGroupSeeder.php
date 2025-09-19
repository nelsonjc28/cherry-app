<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Catalog;
use App\Models\CatalogImageGroup;

class CatalogImageGroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener catálogos existentes
        $catalogs = Catalog::all();

        foreach ($catalogs as $catalog) {
            // Crear grupos de imágenes para cada catálogo
            $groups = [
                [
                    'name' => 'Colección Principal',
                    'description' => 'Imágenes principales del catálogo ' . $catalog->name,
                    'display_order' => 1,
                    'is_active' => true
                ],
                [
                    'name' => 'Detalles y Acabados',
                    'description' => 'Imágenes de detalles y acabados especiales',
                    'display_order' => 2,
                    'is_active' => true
                ],
                [
                    'name' => 'Colores Disponibles',
                    'description' => 'Variaciones de colores y texturas',
                    'display_order' => 3,
                    'is_active' => true
                ],
                [
                    'name' => 'Looks Completos',
                    'description' => 'Outfits completos y combinaciones',
                    'display_order' => 4,
                    'is_active' => true
                ]
            ];

            foreach ($groups as $groupData) {
                CatalogImageGroup::updateOrCreate(
                    [
                        'catalog_id' => $catalog->id,
                        'name' => $groupData['name']
                    ],
                    $groupData
                );
            }
        }

        $this->command->info('Grupos de imágenes creados exitosamente para todos los catálogos.');
    }
}