<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class FixAdminPassword extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-admin-password';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verificar y corregir la contraseña del usuario administrador';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Verificando y corrigiendo contraseña del administrador...');
        
        // Buscar el usuario administrador
        $admin = User::where('email', 'admin@cherrycentral.com')->first();
        
        if (!$admin) {
            $this->error('❌ Usuario administrador no encontrado');
            return 1;
        }
        
        $this->info("✅ Usuario administrador encontrado:");
        $this->line("  - ID: {$admin->id}");
        $this->line("  - Email: {$admin->email}");
        $this->line("  - Rol: " . ($admin->role ? $admin->role->name : 'Sin rol'));
        
        // Establecer una contraseña conocida
        $newPassword = 'admin123';
        $admin->password = Hash::make($newPassword);
        $admin->save();
        
        $this->info("✅ Contraseña actualizada exitosamente");
        $this->line("  - Nueva contraseña: {$newPassword}");
        $this->line("  - Email: admin@cherrycentral.com");
        
        $this->info("\n🔑 Ahora puedes hacer login con:");
        $this->line("  Email: admin@cherrycentral.com");
        $this->line("  Contraseña: admin123");
        
        $this->info("\n🧪 Para probar el login ejecuta:");
        $this->line("  php artisan app:test-login");
        
        return 0;
    }
}
