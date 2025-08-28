<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Catalog;

class ListCatalogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'catalogs:list';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Lista todos los catálogos con su código, nombre y estado';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('📚 Catálogos en la base de datos:');
        $this->newLine();

        $catalogs = Catalog::select('code', 'name', 'is_active', 'display_order')
            ->orderBy('display_order')
            ->get();

        if ($catalogs->isEmpty()) {
            $this->warn('No hay catálogos en la base de datos.');
            return;
        }

        $headers = ['Orden', 'Código', 'Nombre', 'Estado'];
        $rows = [];

        foreach ($catalogs as $catalog) {
            $rows[] = [
                $catalog->display_order,
                $catalog->code,
                $catalog->name,
                $catalog->is_active ? '✅ Activo' : '❌ Inactivo'
            ];
        }

        $this->table($headers, $rows);
        $this->newLine();
        $this->info("Total de catálogos: {$catalogs->count()}");
    }
}
