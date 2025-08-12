<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PrivacyPolicy;

class TestPrivacyPolicy extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-privacy-policy';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Probar la funcionalidad de las políticas de privacidad';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Probando funcionalidad de políticas de privacidad...');
        
        // Verificar que existe al menos una política
        $policies = PrivacyPolicy::all();
        $this->info("Total de políticas en la base de datos: " . $policies->count());
        
        if ($policies->count() > 0) {
            $activePolicy = PrivacyPolicy::getActivePolicy();
            if ($activePolicy) {
                $this->info("✓ Política activa encontrada:");
                $this->line("  - ID: {$activePolicy->id}");
                $this->line("  - Título: {$activePolicy->title}");
                $this->line("  - Versión: {$activePolicy->version}");
                $this->line("  - Estado: " . ($activePolicy->is_active ? 'Activa' : 'Inactiva'));
                $this->line("  - Creada: {$activePolicy->created_at}");
                if ($activePolicy->published_at) {
                    $this->line("  - Publicada: {$activePolicy->published_at}");
                }
                $this->line("  - Contenido: " . substr(strip_tags($activePolicy->content), 0, 100) . "...");
            } else {
                $this->error("✗ No hay política activa");
            }
        } else {
            $this->error("✗ No hay políticas en la base de datos");
        }
        
        $this->info('Test completado.');
        return 0;
    }
}
