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
            'Sin Línea',
            'Vestido',
            'Sudadera',
            'Conjunto',
            'Pantalón',
            'Falda',
            'Blusa',
            'Suéter',
            'Abrigo',
            'Chaleco',
            'Capa',
            'Saco',
            'Chamarra',
            'Gabardina',
            'Jumpsuit',
            'Romper',
            'Pijama',
            'Calzado',
            'Bolsa',
            'Bufanda',
            'Pants',
            'Top',
            'Short',
            'Perfumería'
        ];

        foreach ($categories as $index => $categoryName) {
            Category::updateOrCreate(
                ['name' => $categoryName],
                [
                    'slug' => Str::slug($categoryName),
                    'description' => 'Categoría de ' . strtolower($categoryName),
                    'is_active' => true
                ]
            );
        }
    }
}
