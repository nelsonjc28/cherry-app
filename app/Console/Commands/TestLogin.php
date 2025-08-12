<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestLogin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-login';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Probar el login y obtener token JWT';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔐 Probando login de administrador...');
        
        try {
            $response = Http::post('http://localhost:8000/api/login', [
                'email' => 'admin@cherrycentral.com',
                'password' => 'Admin1234!'
            ]);
            
            if ($response->successful()) {
                $data = $response->json();
                $this->info('✅ Login exitoso!');
                $this->line("Token: " . $data['token']);
                $this->line("Usuario ID: " . ($data['user']['id'] ?? 'N/A'));
                $this->line("Email: " . ($data['user']['email'] ?? 'N/A'));
                $this->line("Rol: " . ($data['user']['role']['name'] ?? 'Sin rol'));
                
                $this->info("\n🔑 Ahora puedes usar este token para acceder a las rutas admin:");
                $this->line("Header: Authorization: Bearer " . $data['token']);
                $this->line("URL: http://localhost:8000/api/admin/privacy-policies");
                
                $this->info("\n📝 Ejemplo con curl:");
                $this->line("curl -H \"Authorization: Bearer " . $data['token'] . "\" http://localhost:8000/api/admin/privacy-policies");
                
                // Probar la API de políticas de privacidad
                $this->info("\n🧪 Probando API de políticas de privacidad...");
                $policyResponse = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $data['token']
                ])->get('http://localhost:8000/api/admin/privacy-policies');
                
                if ($policyResponse->successful()) {
                    $this->info('✅ API de políticas funcionando correctamente!');
                    $policies = $policyResponse->json();
                    $this->line("Total de políticas: " . count($policies['data'] ?? []));
                } else {
                    $this->error('❌ Error en API de políticas:');
                    $this->line("Status: " . $policyResponse->status());
                    $this->line("Response: " . $policyResponse->body());
                }
                
            } else {
                $this->error('❌ Error en el login:');
                $this->line("Status: " . $response->status());
                $this->line("Response: " . $response->body());
            }
            
        } catch (\Exception $e) {
            $this->error('❌ Error de conexión: ' . $e->getMessage());
        }
        
        return 0;
    }
}
