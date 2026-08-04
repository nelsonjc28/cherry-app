<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Añade campos de entrega individual por producto a la tabla `order_items`:
     *   - is_delivered: boolean (default false) — si el producto fue entregado.
     *   - delivered_at: timestamp nullable — fecha de entrega del producto.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->boolean('is_delivered')
                ->default(false)
                ->after('subtotal')
                ->comment('Indica si este producto de la orden fue entregado individualmente.');

            $table->timestamp('delivered_at')
                ->nullable()
                ->after('is_delivered')
                ->comment('Fecha y hora en que el producto fue marcado como entregado.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['is_delivered', 'delivered_at']);
        });
    }
};