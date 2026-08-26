<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Añade la columna `can_change_category` a la tabla `users`:
     *   - BOOLEAN NOT NULL DEFAULT false: solo los vendedores a los que
     *     el admin les otorgue permiso podrán cambiar las categorías de
     *     sus clientes (bronce/oro/diamante).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('can_change_category')
                ->default(false)
                ->comment('Permite que un vendedor cambie la categoría de sus clientes.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('can_change_category');
        });
    }
};