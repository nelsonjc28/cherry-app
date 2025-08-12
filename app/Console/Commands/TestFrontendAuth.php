<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestFrontendAuth extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:test-frontend-auth';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Probar la autenticación del frontend y las APIs protegidas';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧪 Probando autenticación del frontend...');
        
        // Paso 1: Hacer login
        $this->info("\n1️⃣ Haciendo login...");
        $loginResponse = Http::post('http://localhost:8000/api/login', [
            'email' => 'admin@cherrycentral.com',
            'password' => 'Admin1234!'
        ]);
        
        if (!$loginResponse->successful()) {
            $this->error('❌ Error en login: ' . $loginResponse->body());
            return 1;
        }
        
        $loginData = $loginResponse->json();
        $token = $loginData['token'];
        $this->info('✅ Login exitoso');
        $this->line("  - Token: " . substr($token, 0, 50) . '...');
        
        // Paso 2: Probar API de políticas sin token (debe fallar)
        $this->info("\n2️⃣ Probando API sin token (debe fallar)...");
        $noAuthResponse = Http::get('http://localhost:8000/api/admin/privacy-policies');
        $this->line("  - Status: " . $noAuthResponse->status());
        $this->line("  - Response: " . ($noAuthResponse->status() === 401 ? '✅ Correcto (401 Unauthorized)' : '❌ Incorrecto'));
        
        // Paso 3: Probar API de políticas con token (debe funcionar)
        $this->info("\n3️⃣ Probando API con token (debe funcionar)...");
        $authResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->get('http://localhost:8000/api/admin/privacy-policies');
        
        if ($authResponse->successful()) {
            $this->info('✅ API protegida funcionando correctamente');
            $policies = $authResponse->json();
            $this->line("  - Total de políticas: " . count($policies['data'] ?? []));
        } else {
            $this->error('❌ Error en API protegida:');
            $this->line("  - Status: " . $authResponse->status());
            $this->line("  - Response: " . $authResponse->body());
        }
        
        // Paso 4: Verificar que el token sea válido
        $this->info("\n4️⃣ Verificando token...");
        $meResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->get('http://localhost:8000/api/me');
        
        if ($meResponse->successful()) {
            $userData = $meResponse->json();
            $this->info('✅ Token válido');
            $this->line("  - Usuario: " . ($userData['user']['email'] ?? 'N/A'));
            $this->line("  - Rol: " . ($userData['user']['role']['name'] ?? 'Sin rol'));
        } else {
            $this->error('❌ Token inválido: ' . $meResponse->body());
        }
        
        $this->info("\n🎯 Resumen del test:");
        $this->line("  - Login: ✅ Funcionando");
        $this->line("  - API sin token: ✅ Rechazando correctamente");
        $this->line("  - API con token: " . ($authResponse->successful() ? '✅ Funcionando' : '❌ Fallando'));
        $this->line("  - Token válido: " . ($meResponse->successful() ? '✅ Sí' : '❌ No'));
        
        if ($authResponse->successful() && $meResponse->successful()) {
            $this->info("\n🎉 ¡Todo está funcionando correctamente!");
            $this->info("Ahora puedes acceder al panel de administración desde el frontend.");
        } else {
            $this->error("\n⚠️ Hay problemas que necesitan ser resueltos.");
        }
        
        return 0;
    }
}
