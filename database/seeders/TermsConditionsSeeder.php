<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TermsConditions;

class TermsConditionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $content = '<section class="terms-section">
            <h2 class="terms-section__title">1. Aceptación de los Términos</h2>
            <p class="terms-section__text">
                Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones de uso. 
                Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
            </p>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">2. Descripción del Servicio</h2>
            <p class="terms-section__text">
                Cherry Central es una plataforma de comercio electrónico que ofrece productos de moda femenina. 
                Nuestro servicio incluye la visualización de catálogos, información de productos y facilitación de transacciones comerciales.
            </p>
            <p class="terms-section__text">
                <strong>Servicios incluidos:</strong>
            </p>
            <ul class="terms-section__list">
                <li>Navegación y búsqueda de productos</li>
                <li>Gestión de cuentas de usuario</li>
                <li>Procesamiento de pedidos y pagos</li>
                <li>Atención al cliente y soporte técnico</li>
            </ul>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">3. Registro de Cuenta</h2>
            <p class="terms-section__text">
                Para utilizar ciertas funciones de nuestro servicio, debe registrar una cuenta. Se compromete a:
            </p>
            <ul class="terms-section__list">
                <li>Proporcionar información precisa y actualizada</li>
                <li>Mantener la seguridad de su contraseña</li>
                <li>Notificar inmediatamente cualquier uso no autorizado</li>
                <li>Aceptar la responsabilidad por todas las actividades en su cuenta</li>
            </ul>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">4. Uso Aceptable</h2>
            <p class="terms-section__text">
                Usted se compromete a utilizar este sitio web únicamente para fines legales y de acuerdo con estos términos. 
                Está prohibido:
            </p>
            <ul class="terms-section__list">
                <li>Usar el servicio para actividades ilegales o fraudulentas</li>
                <li>Interferir con el funcionamiento del sitio</li>
                <li>Acceder a áreas restringidas sin autorización</li>
                <li>Transmitir contenido malicioso o dañino</li>
            </ul>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">5. Productos y Precios</h2>
            <p class="terms-section__text">
                Nos esforzamos por proporcionar información precisa sobre productos y precios. Sin embargo:
            </p>
            <ul class="terms-section__list">
                <li>Los precios pueden cambiar sin previo aviso</li>
                <li>La disponibilidad de productos no está garantizada</li>
                <li>Nos reservamos el derecho de cancelar pedidos por errores de precio</li>
                <li>Las imágenes son representativas y pueden variar</li>
            </ul>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">6. Pedidos y Pagos</h2>
            <p class="terms-section__text">
                Al realizar un pedido, usted:
            </p>
            <ul class="terms-section__list">
                <li>Confirma que la información proporcionada es correcta</li>
                <li>Autoriza el cargo a su método de pago</li>
                <li>Acepta nuestras políticas de envío y devolución</li>
                <li>Comprende que los pedidos están sujetos a disponibilidad</li>
            </ul>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">7. Propiedad Intelectual</h2>
            <p class="terms-section__text">
                Todo el contenido de este sitio web, incluyendo textos, imágenes, logos y diseños, 
                está protegido por derechos de autor y otras leyes de propiedad intelectual.
            </p>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">8. Limitación de Responsabilidad</h2>
            <p class="terms-section__text">
                En la máxima medida permitida por la ley, Cherry Central no será responsable por 
                daños indirectos, incidentales o consecuentes que resulten del uso de nuestro servicio.
            </p>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">9. Modificaciones</h2>
            <p class="terms-section__text">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Las modificaciones entrarán en vigor inmediatamente después de su publicación.
            </p>
        </section>

        <section class="terms-section">
            <h2 class="terms-section__title">10. Contacto</h2>
            <p class="terms-section__text">
                Si tiene preguntas sobre estos términos y condiciones, puede contactarnos a través de:
            </p>
            <p class="terms-section__text">
                <strong>Correo Electrónico:</strong> terminos@cherry.com
            </p>
            <p class="terms-section__text">
                <strong>Teléfono:</strong> +1 (555) 123-4567
            </p>
        </section>';

        // Crear los términos y condiciones por defecto
        TermsConditions::create([
            'title' => 'Términos y Condiciones de Uso',
            'content' => $content,
            'version' => '1.0',
            'is_active' => true,
            'published_at' => now()
        ]);

        // Crear términos de ejemplo (inactivos)
        $contentExample = '<section class="terms-section">
            <h2 class="terms-section__title">Términos y Condiciones - Versión de Ejemplo</h2>
            <p class="terms-section__text">
                Esta es una versión de ejemplo de los términos y condiciones que puedes usar como base
                para crear nuevas versiones. Los administradores pueden editar, modificar
                y crear nuevos términos desde el panel de administración.
            </p>
            <p class="terms-section__text">
                <strong>Características del sistema:</strong>
            </p>
            <ul class="terms-section__list">
                <li>Editor de texto rico con formato completo</li>
                <li>Control de versiones de términos</li>
                <li>Activación/desactivación de términos</li>
                <li>Seguimiento de aceptaciones por usuario</li>
                <li>Historial de cambios y versiones</li>
            </ul>
        </section>';

        TermsConditions::create([
            'title' => 'Términos y Condiciones - Ejemplo',
            'content' => $contentExample,
            'version' => '1.1',
            'is_active' => false,
            'published_at' => null
        ]);
    }
}
