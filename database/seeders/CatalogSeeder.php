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
                'code' => '96',
                'name' => 'CRITERIA Otoño-Invierno 2025',
                'description' => 'Catálogo CRITERIA para la temporada Otoño-Invierno 2025 con las últimas tendencias y colecciones.',
                'is_active' => true,
                'display_order' => 1
            ],
            [
                'code' => '95',
                'name' => 'FOLEY´S Otoño-Invierno 2025',
                'description' => 'Catálogo FOLEY´S para la temporada Otoño-Invierno 2025 con diseños exclusivos y elegantes.',
                'is_active' => true,
                'display_order' => 2
            ],
            [
                'code' => '94',
                'name' => 'SHYLA - 2025',
                'description' => 'Catálogo SHYLA para el año 2025 con colecciones modernas y sofisticadas.',
                'is_active' => true,
                'display_order' => 3
            ],
            [
                'code' => '93',
                'name' => 'CHERRY 2025 - 5',
                'description' => 'Quinta edición del catálogo CHERRY para el año 2025 con las mejores selecciones.',
                'is_active' => true,
                'display_order' => 4
            ],
            [
                'code' => '92',
                'name' => 'CHERRY 2025 - 4',
                'description' => 'Cuarta edición del catálogo CHERRY para el año 2025 con colecciones destacadas.',
                'is_active' => true,
                'display_order' => 5
            ],
            [
                'code' => '91',
                'name' => 'CRITERIA Primavera 2025',
                'description' => 'Catálogo CRITERIA para la temporada Primavera 2025 con estilos frescos y vibrantes.',
                'is_active' => true,
                'display_order' => 6
            ],
            [
                'code' => '90',
                'name' => 'CHERRY 2025 - 3',
                'description' => 'Tercera edición del catálogo CHERRY para el año 2025 con las últimas novedades.',
                'is_active' => true,
                'display_order' => 7
            ],
            [
                'code' => '89',
                'name' => 'CHERRY 2025 - 2',
                'description' => 'Segunda edición del catálogo CHERRY para el año 2025 con colecciones exclusivas.',
                'is_active' => true,
                'display_order' => 8
            ],
            [
                'code' => '88',
                'name' => 'FOLEY´S Primavera Verano 2025',
                'description' => 'Catálogo FOLEY´S para la temporada Primavera Verano 2025 con estilos modernos y elegantes.',
                'is_active' => true,
                'display_order' => 9
            ],
            [
                'code' => '87',
                'name' => 'CHERRY 2025 - 1',
                'description' => 'Primera edición del catálogo CHERRY para el año 2025 con las mejores selecciones del año.',
                'is_active' => true,
                'display_order' => 10
            ],
            [
                'code' => '86',
                'name' => 'ALYSH-2024',
                'description' => 'Catálogo ALYSH para el año 2024 con colecciones únicas y exclusivas.',
                'is_active' => true,
                'display_order' => 11
            ],
            [
                'code' => '85',
                'name' => 'SHYLA-2024',
                'description' => 'Catálogo SHYLA para el año 2024 con diseños modernos y sofisticados.',
                'is_active' => true,
                'display_order' => 12
            ],
            [
                'code' => '84',
                'name' => 'CRITERIA Otoño-Invierno 2024',
                'description' => 'Catálogo CRITERIA para la temporada Otoño-Invierno 2024 con las últimas tendencias.',
                'is_active' => true,
                'display_order' => 13
            ],
            [
                'code' => '83',
                'name' => 'FOLEY´S-OTO-INV-2024',
                'description' => 'Catálogo FOLEY´S para la temporada Otoño-Invierno 2024 con colecciones elegantes.',
                'is_active' => true,
                'display_order' => 14
            ],
            [
                'code' => '82',
                'name' => 'CIRAGAN-2024',
                'description' => 'Catálogo CIRAGAN para el año 2024 con diseños únicos y exclusivos.',
                'is_active' => true,
                'display_order' => 15
            ],
            [
                'code' => '80',
                'name' => 'Virtual On Line',
                'description' => 'Catálogo Virtual On Line con acceso abierto a todas las colecciones disponibles.',
                'is_active' => true,
                'display_order' => 16
            ],
            [
                'code' => '79',
                'name' => 'CHERRY 2024 - 5',
                'description' => 'Quinta edición del catálogo CHERRY para el año 2024 con las mejores selecciones.',
                'is_active' => true,
                'display_order' => 17
            ],
            [
                'code' => '78',
                'name' => 'CHERRY 2024 - 4',
                'description' => 'Cuarta edición del catálogo CHERRY para el año 2024 con colecciones destacadas.',
                'is_active' => true,
                'display_order' => 18
            ],
            [
                'code' => '77',
                'name' => 'SHYLA 2024',
                'description' => 'Catálogo SHYLA para el año 2024 con diseños modernos y sofisticados.',
                'is_active' => true,
                'display_order' => 19
            ],
            [
                'code' => '76',
                'name' => 'CHERRY 2024 - 3',
                'description' => 'Tercera edición del catálogo CHERRY para el año 2024 con las últimas novedades.',
                'is_active' => true,
                'display_order' => 20
            ]
        ];

        foreach ($catalogs as $catalogData) {
            Catalog::updateOrCreate(
                ['code' => $catalogData['code']],
                $catalogData
            );
        }

        $this->command->info('Catálogos creados exitosamente!');
    }
}
