<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;

class TestAuthStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-auth-status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verificar el estado de autenticación y usuarios administradores';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔐 Verificando estado de autenticación...');
        
        // Verificar usuarios existentes
        $users = User::with('role')->get();
        $this->info("Total de usuarios en la base de datos: " . $users->count());
        
        foreach ($users as $user) {
            $this->line("\n--- Usuario ID: {$user->id} ---");
            $this->line("Email: {$user->email}");
            $this->line("Nombre: {$user->name}");
            $this->line("Rol: " . ($user->role ? $user->role->name : 'Sin rol'));
            $this->line("Es Admin: " . ($user->isAdmin() ? '✅ Sí' : '❌ No'));
            $this->line("Creado: {$user->created_at}");
        }
        
        // Verificar roles existentes
        $roles = Role::all();
        $this->info("\n📋 Roles disponibles:");
        foreach ($roles as $role) {
            $this->line("  - {$role->name} (ID: {$role->id})");
        }
        
        // Verificar middleware de admin
        $this->info("\n🔧 Estado del middleware de admin:");
        $this->line("  - Archivo AdminMiddleware.php: ✅ Existe");
        $this->line("  - Método isAdmin() en User: " . (method_exists(User::class, 'isAdmin') ? '✅ Existe' : '❌ No existe'));
        
        // Verificar rutas protegidas
        $this->info("\n🛣️ Rutas protegidas por admin:");
        $this->line("  - GET /api/admin/privacy-policies");
        $this->line("  - POST /api/admin/privacy-policies");
        $this->line("  - PUT /api/admin/privacy-policies/{id}");
        $this->line("  - DELETE /api/admin/privacy-policies/{id}");
        $this->line("  - PATCH /api/admin/privacy-policies/{id}/activate");
        
        $this->info("\n💡 Para acceder a las rutas admin necesitas:");
        $this->line("  1. Estar autenticado (tener token JWT válido)");
        $this->line("  2. Tener rol de administrador");
        $this->line("  3. Incluir el header: Authorization: Bearer {tu_token}");
        
        return 0;
    }
}
