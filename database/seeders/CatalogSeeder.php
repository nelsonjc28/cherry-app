<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Catalog;

class CatalogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $catalogs = [
            [
                'name' => 'Catálogo de Verano 2024',
                'description' => 'Nuestra colección más fresca y vibrante para la temporada de verano. Incluye prendas ligeras, colores brillantes y estilos modernos.',
                'is_active' => true,
                'display_order' => 1
            ],
            [
                'name' => 'Catálogo de Otoño 2024',
                'description' => 'Descubre la elegancia del otoño con nuestra colección de prendas sofisticadas. Tonos tierra, texturas ricas y diseños atemporales.',
                'is_active' => true,
                'display_order' => 2
            ],
            [
                'name' => 'Catálogo de Accesorios',
                'description' => 'Complementa tu look con nuestra selección de accesorios únicos. Desde joyería hasta bolsos, encuentra el toque perfecto.',
                'is_active' => true,
                'display_order' => 3
            ]
        ];

        foreach ($catalogs as $catalogData) {
            Catalog::updateOrCreate(
                ['name' => $catalogData['name']],
                $catalogData
            );
        }

        $this->command->info('Catálogos creados exitosamente!');
    }
}
