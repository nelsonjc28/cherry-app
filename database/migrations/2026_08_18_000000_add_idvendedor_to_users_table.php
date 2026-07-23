<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Añade la columna `idvendedor` a la tabla `users`:
     *   - VARCHAR(64) NULLABLE: el idvendedor puede ser cualquier identificador externo
     *     (ej. '111', 'VEN-001', '0000' para DIRECTO).
     *   - INDEX normal: búsquedas rápidas por idvendedor (ej. "qué clientes atiende
     *     el vendor 111").
     *   - UNIQUE condicional: solo role_id=4 (vendedor) — evita que dos vendedores
     *     tengan el mismo idvendedor manual. Los clientes (role_id=2) repiten el
     *     idvendedor del vendor que los atiende.
     *
     * Origen del dato:
     *   - Vendedores (role_id=4): introducido manualmente por el admin.
     *   - Clientes (role_id=2): sincronizado desde la API externa de clientes
     *     (campo `idVendedor` de la respuesta de /cliente/DMxxxxx).
     */
    public function up(): void
    {
        // Verificar si la columna ya existe (por si la migración se ejecutó parcialmente antes).
        $hasColumn = collect(DB::select("SHOW COLUMNS FROM users WHERE Field = 'idvendedor'"))->isNotEmpty();
        $hasIndex = collect(DB::select("SHOW INDEX FROM users WHERE Key_name = 'users_idvendedor_index'"))->isNotEmpty();
        $hasUniqueIndex = collect(DB::select("SHOW INDEX FROM users WHERE Key_name = 'users_idvendedor_vendor_unique'"))->isNotEmpty();

        if (! $hasColumn) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('idvendedor', 64)
                    ->nullable()
                    ->after('role_id')
                    ->comment('Identificador externo del vendedor. Manual para vendors, sincronizado desde API para clientes.');

                $table->index('idvendedor');
            });
        } elseif (! $hasIndex) {
            Schema::table('users', function (Blueprint $table) {
                $table->index('idvendedor');
            });
        }

        // MariaDB no soporta índices únicos parciales (CREATE UNIQUE INDEX ... WHERE).
        // La unicidad de idvendedor para vendors (role_id=4) se valida en el modelo
        // User mediante un listener 'saving' (ver método booted()).
        if (! $hasUniqueIndex) {
            // Dejamos un placeholder del intento por si se migra a MySQL puro en el futuro.
            // No creamos el índice aquí para evitar errores de sintaxis en MariaDB.
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS users_idvendedor_vendor_unique');
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['idvendedor']);
            $table->dropColumn('idvendedor');
        });
    }
};
