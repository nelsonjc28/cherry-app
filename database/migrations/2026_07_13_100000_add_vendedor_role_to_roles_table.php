<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Inserta el rol 'vendedor' (id=4) en la tabla roles.
     * ids 1=admin, 2=cliente, 3=operador reservados por migraciones/seeders previos.
     */
    public function up(): void
    {
        $vendedorRole = DB::table('roles')->where('name', 'vendedor')->first();
        if (! $vendedorRole) {
            DB::table('roles')->insert([
                'id' => 4,
                'name' => 'vendedor',
                'description' => 'Vendedor: usuario que realiza pedidos en nombre de clientes oro/diamante asociados',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->where('name', 'vendedor')->delete();
    }
};