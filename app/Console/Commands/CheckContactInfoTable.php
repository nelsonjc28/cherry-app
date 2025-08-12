<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\ContactInfo;

class CheckContactInfoTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'check:contact-info-table';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check if contact_info table exists and is accessible';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Verificando tabla contact_info...');
        
        try {
            // Verificar si la tabla existe
            $tables = DB::select('SHOW TABLES LIKE "contact_info"');
            if (empty($tables)) {
                $this->error('La tabla contact_info no existe');
                return 1;
            }
            
            $this->info('✓ Tabla contact_info existe');
            
            // Verificar si podemos acceder a la tabla
            $result = DB::table('contact_info')->first();
            $this->info('✓ Tabla contact_info es accesible');
            
            // Verificar el modelo
            $contactInfo = ContactInfo::first();
            $this->info('✓ Modelo ContactInfo funciona correctamente');
            
            // Probar la API
            $this->info('Probando API...');
            $controller = new \App\Http\Controllers\Api\ContactInfoController();
            $response = $controller->show();
            $this->info('✓ API funciona correctamente');
            
            $this->info('Todo está funcionando correctamente');
            return 0;
            
        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }
}
