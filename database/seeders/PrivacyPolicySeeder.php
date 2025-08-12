<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PrivacyPolicy;

class PrivacyPolicySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $content = '<section class="privacy-section">
            <h2 class="privacy-section__title">1. Introducción</h2>
            <p class="privacy-section__text">
                En Cherry, valoramos tu privacidad y estamos comprometidos a proteger tus
                datos personales. Esta política describe cómo recopilamos, usamos,
                almacenamos y protegemos tu información cuando visitas nuestro sitio web.
            </p>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">2. Información que Recopilamos</h2>
            <p class="privacy-section__text">
                Recopilamos diferentes tipos de información para ofrecerte una experiencia de
                compra personalizada:
            </p>
            <p class="privacy-section__text">
                <strong>Información Personal:</strong> Nombre, dirección de correo electrónico, dirección de
                envío, número de teléfono y detalles de pago.
            </p>
            <p class="privacy-section__text">
                <strong>Información de Navegación:</strong> Datos sobre cómo interactúas con nuestro sitio,
                incluyendo tu dirección IP, tipo de navegador y páginas visitadas.
            </p>
            <p class="privacy-section__text">
                <strong>Cookies:</strong> Utilizamos cookies para mejorar tu experiencia en nuestro sitio. Puedes
                optar por no aceptar cookies, pero esto puede afectar tu capacidad para utilizar
                ciertas funciones.
            </p>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">3. Uso de la Información</h2>
            <p class="privacy-section__text">
                Utilizamos la información que recopilamos para:
            </p>
            <ul class="privacy-section__list">
                <li>Procesar y gestionar tus pedidos.</li>
                <li>Mejorar nuestros productos y servicios.</li>
                <li>Enviarte información sobre promociones y novedades.</li>
                <li>Responder a tus consultas y brindar atención al cliente.</li>
            </ul>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">4. Seguridad de la Información</h2>
            <p class="privacy-section__text">
                Implementamos medidas de seguridad adecuadas para proteger tu
                información personal contra el acceso no autorizado, la divulgación o el uso
                indebido. Esto incluye:
            </p>
            <ul class="privacy-section__list">
                <li>Uso de tecnología de cifrado para la transmisión de datos sensibles.</li>
                <li>Control de acceso a la información personal.</li>
                <li>Entrenamiento regular de nuestro personal sobre prácticas de seguridad.</li>
            </ul>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">5. Compartición de Información</h2>
            <p class="privacy-section__text">
                No vendemos, alquilamos ni compartimos tu información personal con terceros,
                excepto en las siguientes circunstancias:
            </p>
            <ul class="privacy-section__list">
                <li>Con proveedores de servicios que nos ayudan a operar nuestro negocio (por ejemplo, procesadores de pagos).</li>
                <li>Cuando sea requerido por ley o para proteger nuestros derechos.</li>
            </ul>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">6. Tus Derechos</h2>
            <p class="privacy-section__text">Tienes derecho a:</p>
            <ul class="privacy-section__list">
                <li>Acceder a la información que tenemos sobre ti.</li>
                <li>Solicitar la corrección de datos inexactos.</li>
                <li>Pedir la eliminación de tu información personal.</li>
                <li>Optar por no recibir comunicaciones de marketing.</li>
            </ul>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">7. Cambios a esta Política</h2>
            <p class="privacy-section__text">
                Nos reservamos el derecho de actualizar esta política en cualquier momento. Te
                notificaremos sobre cambios significativos mediante un aviso en nuestro sitio
                web.
            </p>
        </section>

        <section class="privacy-section">
            <h2 class="privacy-section__title">8. Contacto</h2>
            <p class="privacy-section__text">
                Si tienes preguntas o inquietudes sobre nuestra política de privacidad, no dudes
                en contactarnos a través de:
            </p>
            <p class="privacy-section__text">
                <strong>Correo Electrónico:</strong> contacto@cherry.com
            </p>
            <p class="privacy-section__text">
                <strong>Teléfono:</strong> +1 (555) 123-4567
            </p>
        </section>';

        // Crear la política de privacidad por defecto
        PrivacyPolicy::create([
            'title' => 'Política de Privacidad y Seguridad',
            'content' => $content,
            'version' => '1.0',
            'is_active' => true,
            'published_at' => now()
        ]);

        // Crear una política adicional de ejemplo (inactiva)
        $contentExample = '<section class="privacy-section">
            <h2 class="privacy-section__title">Política de Privacidad - Versión de Ejemplo</h2>
            <p class="privacy-section__text">
                Esta es una política de privacidad de ejemplo que puedes usar como base
                para crear nuevas versiones. Los administradores pueden editar, modificar
                y crear nuevas políticas desde el panel de administración.
            </p>
            <p class="privacy-section__text">
                <strong>Características del sistema:</strong>
            </p>
            <ul class="privacy-section__list">
                <li>Editor de texto rico con formato completo</li>
                <li>Control de versiones de políticas</li>
                <li>Activación/desactivación de políticas</li>
                <li>Contenido dinámico en el perfil de usuario</li>
            </ul>
        </section>';

        PrivacyPolicy::create([
            'title' => 'Política de Privacidad - Ejemplo',
            'content' => $contentExample,
            'version' => '1.1',
            'is_active' => false,
            'published_at' => null
        ]);
    }
}
