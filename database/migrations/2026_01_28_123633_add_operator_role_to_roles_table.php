<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Insertar el rol de operador si no existe
        $operatorRole = DB::table('roles')->where('name', 'operador')->first();
        if (! $operatorRole) {
            // id 1 y 2 reservados para admin/cliente (RoleSeeder)
            DB::table('roles')->insert([
                'id' => 3,
                'name' => 'operador',
                'description' => 'Usuario operador con permisos limitados',
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
        // Eliminar el rol de operador
        DB::table('roles')->where('name', 'operador')->delete();
    }
};
