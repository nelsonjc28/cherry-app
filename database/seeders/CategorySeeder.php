<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Category;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'SIN LINEA',
                'code' => '0',
                'description' => 'Productos sin línea específica.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'Vestidos',
                'code' => '1',
                'description' => 'Hermosos vestidos para toda ocasión, desde casuales hasta elegantes para eventos especiales.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'SUDADERA',
                'code' => '2',
                'description' => 'Sudaderas cómodas y casuales para el día a día.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'Conjuntos',
                'code' => '3',
                'description' => 'Conjuntos coordinados que facilitan la elección del outfit perfecto.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'PANTALON',
                'code' => '4',
                'description' => 'Pantalones cómodos y estilosos para el día a día.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'FALDA',
                'code' => '5',
                'description' => 'Faldas femeninas y versátiles para diferentes ocasiones.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'BLUSA',
                'code' => '6',
                'description' => 'Blusas versátiles y elegantes para complementar cualquier outfit.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'SUETER',
                'code' => '7',
                'description' => 'Suéteres abrigados y elegantes para las temporadas frías.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'ABRIGO',
                'code' => '8',
                'description' => 'Abrigos elegantes y abrigados para protegerte del frío.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'CHALECO',
                'code' => '9',
                'description' => 'Chalecos versátiles que complementan cualquier outfit.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'CAPA',
                'code' => '10',
                'description' => 'Capas elegantes y versátiles para complementar tu estilo.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'SACO',
                'code' => '11',
                'description' => 'Sacos elegantes y versátiles para diferentes ocasiones.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'CHAMARRA',
                'code' => '12',
                'description' => 'Chamarras cómodas y estilosas para el día a día.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'GABARDINA',
                'code' => '13',
                'description' => 'Gabardinas elegantes y versátiles para complementar tu estilo.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'JUMPSUIT',
                'code' => '14',
                'description' => 'Jumpsuits elegantes y prácticos para una silueta estilizada.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'ROMPER',
                'code' => '15',
                'description' => 'Rompers elegantes y versátiles para diferentes ocasiones.',
                'opc_web' => 'N'
            ],
            [
                'name' => 'PIJAMA',
                'code' => '16',
                'description' => 'Pijamas cómodos y elegantes para descansar en estilo.',
                'opc_web' => 'N'
            ],
            [
                'name' => 'CALZADO',
                'code' => '17',
                'description' => 'Zapatos y sandalias para complementar cualquier outfit.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'BOLSA',
                'code' => '18',
                'description' => 'Bolsas elegantes y funcionales para complementar tu estilo.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'BUFANDA',
                'code' => '19',
                'description' => 'Bufandas elegantes y abrigadas para las temporadas frías.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'PANTS',
                'code' => '20',
                'description' => 'Pants cómodos y estilosos para el día a día.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'TOP',
                'code' => '21',
                'description' => 'Tops versátiles para diferentes ocasiones y estilos.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'SHORT',
                'code' => '22',
                'description' => 'Shorts cómodos y frescos para los días calurosos.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'PERFUMERIAS',
                'code' => '23',
                'description' => 'Fragancias y productos de belleza para completar tu rutina.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'Cosmeticos',
                'code' => '24',
                'description' => 'Productos de belleza y cosméticos para completar tu rutina.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'CABALLERO',
                'code' => 'CABALLERO',
                'description' => 'Línea de productos para caballero.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'DAMA',
                'code' => 'DAMA',
                'description' => 'Línea de productos para dama.',
                'opc_web' => 'S'
            ],
            [
                'name' => 'UNISEX',
                'code' => 'UNISEX',
                'description' => 'Línea de productos unisex.',
                'opc_web' => 'S'
            ]
        ];

        foreach ($categories as $categoryData) {
            Category::updateOrCreate(
                ['code' => $categoryData['code']],
                [
                    'name' => $categoryData['name'],
                    'slug' => Str::slug($categoryData['name'] . '-' . $categoryData['code']),
                    'description' => $categoryData['description'],
                    'image' => '/images/categories/' . $categoryData['name'] . '.png',
                    'opc_web' => $categoryData['opc_web'],
                    'is_active' => $categoryData['opc_web'] === 'S'
                ]
            );
        }

        $this->command->info('Categorías creadas exitosamente!');
    }
}
