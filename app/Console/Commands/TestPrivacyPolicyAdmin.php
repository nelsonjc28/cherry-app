<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PrivacyPolicy;

class TestPrivacyPolicyAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-privacy-policy-admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Probar la funcionalidad del admin de políticas de privacidad';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Probando funcionalidad del admin de políticas de privacidad...');
        
        // Verificar todas las políticas
        $policies = PrivacyPolicy::orderBy('created_at', 'desc')->get();
        $this->info("Total de políticas en la base de datos: " . $policies->count());
        
        foreach ($policies as $policy) {
            $this->line("\n--- Política ID: {$policy->id} ---");
            $this->line("Título: {$policy->title}");
            $this->line("Versión: {$policy->version}");
            $this->line("Estado: " . ($policy->is_active ? '✅ Activa' : '❌ Inactiva'));
            $this->line("Creada: {$policy->created_at}");
            if ($policy->published_at) {
                $this->line("Publicada: {$policy->published_at}");
            }
            
            // Mostrar un resumen del contenido
            $contentPreview = strip_tags($policy->content);
            $contentPreview = substr($contentPreview, 0, 150) . '...';
            $this->line("Contenido: " . $contentPreview);
        }
        
        // Verificar la política activa
        $activePolicy = PrivacyPolicy::getActivePolicy();
        if ($activePolicy) {
            $this->info("\n✅ Política activa encontrada:");
            $this->line("  - ID: {$activePolicy->id}");
            $this->line("  - Título: {$activePolicy->title}");
            $this->line("  - Versión: {$activePolicy->version}");
        } else {
            $this->error("\n❌ No hay política activa");
        }
        
        $this->info('\nTest del admin completado.');
        $this->info('Ahora puedes:');
        $this->info('1. Ir al Panel de Administración');
        $this->info('2. Hacer clic en "Políticas de Privacidad"');
        $this->info('3. Ver las políticas creadas por defecto');
        $this->info('4. Editar, crear nuevas o activar políticas');
        $this->info('5. Los cambios se reflejarán automáticamente en el perfil de usuario');
        
        return 0;
    }
}
