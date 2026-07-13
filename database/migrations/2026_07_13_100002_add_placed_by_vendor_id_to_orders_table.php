<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Agrega placed_by_vendor_id a orders:
     *   - user_id sigue siendo el comprador real (a quien se le carga el pedido).
     *   - placed_by_vendor_id es el vendedor que gestionó el pedido (nullable para órdenes históricas).
     *   - ON DELETE SET NULL: si se elimina el vendedor, la orden se conserva sin referencia.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('placed_by_vendor_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->index('placed_by_vendor_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['placed_by_vendor_id']);
            $table->dropConstrainedForeignId('placed_by_vendor_id');
        });
    }
};