<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            // Índice para búsquedas por descripción (usando índice normal ya que FULLTEXT requiere MyISAM)
            // MySQL/MariaDB puede usar este índice para búsquedas LIKE con prefijo
            $table->index('descripcion', 'idx_productos_descripcion');
            
            // Índice compuesto para búsquedas por categoría + descripción
            $table->index(['id_linea', 'descripcion'], 'idx_productos_linea_descripcion');
            
            // Índice para productos activos y nuevos
            $table->index(['opc_nuevo', 'fecha_alta'], 'idx_productos_nuevos');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropIndex('idx_productos_descripcion');
            $table->dropIndex('idx_productos_linea_descripcion');
            $table->dropIndex('idx_productos_nuevos');
        });
    }
};
