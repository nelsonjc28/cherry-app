<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ClearPWACache extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pwa:clear-cache';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear PWA cache and force reinstall prompt';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Limpiando caché de PWA...');
        
        // Limpiar caché de Laravel
        $this->call('cache:clear');
        $this->call('config:clear');
        $this->call('view:clear');
        $this->call('route:clear');
        
        $this->info('Caché limpiado. Para forzar el modal de instalación:');
        $this->line('1. Abre las herramientas de desarrollador (F12)');
        $this->line('2. Ve a Application > Storage > Local Storage');
        $this->line('3. Elimina la clave "pwa-modal-shown"');
        $this->line('4. Recarga la página');
        
        $this->info('Completado.');
    }
}