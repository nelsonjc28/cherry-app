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
                'name' => 'Sin Línea',
                'code' => '00',
                'description' => 'Productos sin línea específica.'
            ],
            [
                'name' => 'Vestidos',
                'code' => '01',
                'description' => 'Hermosos vestidos para toda ocasión, desde casuales hasta elegantes para eventos especiales.'
            ],
            [
                'name' => 'Sudadera',
                'code' => '02',
                'description' => 'Sudaderas cómodas y casuales para el día a día.'
            ],
            [
                'name' => 'Conjuntos',
                'code' => '03',
                'description' => 'Conjuntos coordinados que facilitan la elección del outfit perfecto.'
            ],
            [
                'name' => 'Pantalón',
                'code' => '04',
                'description' => 'Pantalones cómodos y estilosos para el día a día.'
            ],
            [
                'name' => 'Falda',
                'code' => '05',
                'description' => 'Faldas femeninas y versátiles para diferentes ocasiones.'
            ],
            [
                'name' => 'Blusa',
                'code' => '06',
                'description' => 'Blusas versátiles y elegantes para complementar cualquier outfit.'
            ],
            [
                'name' => 'Suéter',
                'code' => '07',
                'description' => 'Suéteres abrigados y elegantes para las temporadas frías.'
            ],
            [
                'name' => 'Abrigo',
                'code' => '08',
                'description' => 'Abrigos elegantes y abrigados para protegerte del frío.'
            ],
            [
                'name' => 'Chaleco',
                'code' => '09',
                'description' => 'Chalecos versátiles que complementan cualquier outfit.'
            ],
            [
                'name' => 'Capa',
                'code' => '10',
                'description' => 'Capas elegantes y versátiles para complementar tu estilo.'
            ],
            [
                'name' => 'Saco',
                'code' => '11',
                'description' => 'Sacos elegantes y versátiles para diferentes ocasiones.'
            ],
            [
                'name' => 'Chamarra',
                'code' => '12',
                'description' => 'Chamarras cómodas y estilosas para el día a día.'
            ],
            [
                'name' => 'Gabardina',
                'code' => '13',
                'description' => 'Gabardinas elegantes y versátiles para complementar tu estilo.'
            ],
            [
                'name' => 'Jumpsuit',
                'code' => '14',
                'description' => 'Jumpsuits elegantes y prácticos para una silueta estilizada.'
            ],
            [
                'name' => 'Romper',
                'code' => '15',
                'description' => 'Rompers elegantes y versátiles para diferentes ocasiones.'
            ],
            [
                'name' => 'Pijama',
                'code' => '16',
                'description' => 'Pijamas cómodos y elegantes para descansar en estilo.'
            ],
            [
                'name' => 'Calzado',
                'code' => '17',
                'description' => 'Zapatos y sandalias para complementar cualquier outfit.'
            ],
            [
                'name' => 'Bolsa',
                'code' => '18',
                'description' => 'Bolsas elegantes y funcionales para complementar tu estilo.'
            ],
            [
                'name' => 'Bufanda',
                'code' => '19',
                'description' => 'Bufandas elegantes y abrigadas para las temporadas frías.'
            ],
            [
                'name' => 'Pants',
                'code' => '20',
                'description' => 'Pants cómodos y estilosos para el día a día.'
            ],
            [
                'name' => 'Top',
                'code' => '21',
                'description' => 'Tops versátiles para diferentes ocasiones y estilos.'
            ],
            [
                'name' => 'Short',
                'code' => '22',
                'description' => 'Shorts cómodos y frescos para los días calurosos.'
            ],
            [
                'name' => 'Perfumería',
                'code' => '23',
                'description' => 'Fragancias y productos de belleza para completar tu rutina.'
            ],
            [
                'name' => 'Cosméticos',
                'code' => '24',
                'description' => 'Productos de belleza y cosméticos para completar tu rutina.'
            ]
        ];

        foreach ($categories as $categoryData) {
            Category::updateOrCreate(
                ['name' => $categoryData['name']],
                [
                    'slug' => Str::slug($categoryData['name']),
                    'code' => $categoryData['code'],
                    'description' => $categoryData['description'],
                    'is_active' => true
                ]
            );
        }

        $this->command->info('Categorías creadas exitosamente!');
    }
}
