<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fecha de compra desde API externa (fechaCompra), separada de fecha_alta.
     */
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->date('fecha_compra')->nullable()->after('fecha_alta');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('fecha_compra');
        });
    }
};
