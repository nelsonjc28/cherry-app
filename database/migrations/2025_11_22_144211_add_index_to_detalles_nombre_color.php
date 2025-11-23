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
        Schema::table('detalles', function (Blueprint $table) {
            // Índice compuesto para búsquedas de colores por producto
            $table->index(['producto_id', 'nombreColor'], 'idx_detalles_producto_color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detalles', function (Blueprint $table) {
            $table->dropIndex('idx_detalles_producto_color');
        });
    }
};
