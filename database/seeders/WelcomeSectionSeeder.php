<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\WelcomeSection;

class WelcomeSectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear sección de bienvenida por defecto
        WelcomeSection::updateOrCreate(
            ['title' => '¡Bienvenida a la moda que te inspira!'],
            [
                'subtitle' => 'Explora nuestra colección única y actualizada que resalta tu estilo personal. Afíliate hoy y accede a ofertas exclusivas que no querrás perderte.',
                'button_text' => 'Explorar Colección',
                'button_url' => '/catalogo',
                'image_path' => 'images/welcome-sections/default-welcome.jpg',
                'is_active' => true,
                'display_order' => 1
            ]
        );

        // Crear sección alternativa
        WelcomeSection::updateOrCreate(
            ['title' => 'Descubre tu estilo único'],
            [
                'subtitle' => 'Encuentra las últimas tendencias en moda femenina. Desde vestidos elegantes hasta accesorios que complementan tu look perfecto.',
                'button_text' => 'Ver Nuevos Productos',
                'button_url' => '/nuevos',
                'image_path' => 'images/welcome-sections/style-welcome.jpg',
                'is_active' => false,
                'display_order' => 2
            ]
        );

        $this->command->info('Secciones de bienvenida creadas exitosamente!');
    }
} 