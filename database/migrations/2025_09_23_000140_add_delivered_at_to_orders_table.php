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
        Schema::table('orders', function (Blueprint $table) {
            // Agregar campo para fecha de entrega
            $table->timestamp('delivered_at')->nullable()->after('updated_at');
            
            // Actualizar comentario del campo status para incluir los nuevos estados
            $table->string('status')->default('pending')->comment('Estados: pending, pagado, en_espera_envio, enviado, entregado')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivered_at');
            // Restaurar comentario original del status
            $table->string('status')->default('pending')->comment('Estados: pending, processing, completed, failed, cancelled')->change();
        });
    }
};
