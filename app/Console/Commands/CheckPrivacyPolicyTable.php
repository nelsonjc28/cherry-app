<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class CheckPrivacyPolicyTable extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-privacy-policy-table';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verificar la estructura de la tabla privacy_policies';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Verificando tabla privacy_policies...');
        
        if (!Schema::hasTable('privacy_policies')) {
            $this->error('La tabla privacy_policies no existe');
            return 1;
        }
        
        $this->info('✓ Tabla privacy_policies existe');
        
        $columns = Schema::getColumnListing('privacy_policies');
        $this->info('Columnas encontradas: ' . implode(', ', $columns));
        
        $tableInfo = DB::select("DESCRIBE privacy_policies");
        $this->info('Estructura detallada:');
        foreach ($tableInfo as $column) {
            $this->line("  - {$column->Field}: {$column->Type} " . ($column->Null === 'NO' ? 'NOT NULL' : 'NULL'));
        }
        
        $count = DB::table('privacy_policies')->count();
        $this->info("Total de registros: {$count}");
        
        return 0;
    }
}
