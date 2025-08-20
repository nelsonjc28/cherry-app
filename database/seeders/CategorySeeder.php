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
                'name' => 'Vestidos',
                'description' => 'Hermosos vestidos para toda ocasión, desde casuales hasta elegantes para eventos especiales.'
            ],
            [
                'name' => 'Blusas',
                'description' => 'Blusas versátiles y elegantes para complementar cualquier outfit.'
            ],
            [
                'name' => 'Pantalones',
                'description' => 'Pantalones cómodos y estilosos para el día a día.'
            ],
            [
                'name' => 'Faldas',
                'description' => 'Faldas femeninas y versátiles para diferentes ocasiones.'
            ],
            [
                'name' => 'Conjuntos',
                'description' => 'Conjuntos coordinados que facilitan la elección del outfit perfecto.'
            ],
            [
                'name' => 'Suéteres',
                'description' => 'Suéteres abrigados y elegantes para las temporadas frías.'
            ],
            [
                'name' => 'Sudadera',
                'description' => 'Sudaderas cómodas y casuales para el día a día.'
            ],
            [
                'name' => 'Abrigos',
                'description' => 'Abrigos elegantes y abrigados para protegerte del frío.'
            ],
            [
                'name' => 'Chalecos',
                'description' => 'Chalecos versátiles que complementan cualquier outfit.'
            ],
            [
                'name' => 'Jumpsuits',
                'description' => 'Jumpsuits elegantes y prácticos para una silueta estilizada.'
            ],
            [
                'name' => 'Shorts',
                'description' => 'Shorts cómodos y frescos para los días calurosos.'
            ],
            [
                'name' => 'Tops',
                'description' => 'Tops versátiles para diferentes ocasiones y estilos.'
            ],
            [
                'name' => 'Pijamas',
                'description' => 'Pijamas cómodos y elegantes para descansar en estilo.'
            ],
            [
                'name' => 'Calzado',
                'description' => 'Zapatos y sandalias para complementar cualquier outfit.'
            ],

            [
                'name' => 'Accesorios',
                'description' => 'Accesorios como bufandas, cinturones y más para complementar tu estilo.'
            ],
            [
                'name' => 'Perfumería',
                'description' => 'Fragancias y productos de belleza para completar tu rutina.'
            ],
            [
                'name' => 'Ropa Deportiva',
                'description' => 'Ropa cómoda y funcional para tus actividades deportivas.'
            ],
            [
                'name' => 'Ropa de Baño',
                'description' => 'Trajes de baño elegantes para disfrutar del sol y la playa.'
            ],
            [
                'name' => 'Ropa Interior',
                'description' => 'Ropa interior cómoda y elegante para sentirte segura.'
            ],
            [
                'name' => 'Ropa de Maternidad',
                'description' => 'Ropa cómoda y elegante diseñada especialmente para embarazadas.'
            ],
            [
                'name' => 'Ropa de Talla Grande',
                'description' => 'Ropa elegante y cómoda en tallas especiales para todas las mujeres.'
            ],
            [
                'name' => 'Ropa de Fiesta',
                'description' => 'Vestidos y conjuntos elegantes para eventos especiales y celebraciones.'
            ],
            [
                'name' => 'Ropa de Trabajo',
                'description' => 'Ropa profesional y elegante para el entorno laboral.'
            ]
        ];

        foreach ($categories as $categoryData) {
            Category::updateOrCreate(
                ['name' => $categoryData['name']],
                [
                    'slug' => Str::slug($categoryData['name']),
                    'description' => $categoryData['description'],
                    'is_active' => true
                ]
            );
        }

        $this->command->info('Categorías creadas exitosamente!');
    }
}
