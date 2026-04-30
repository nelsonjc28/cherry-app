<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Descuentos por volumen desde API de clientes (descuento1 / descuento2); sin categoría vendedor.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('volume_descuento1', 5, 2)->nullable()->after('seller_category')
                ->comment('Primer tramo volumen % (API descuento1)');
            $table->decimal('volume_descuento2', 5, 2)->nullable()->after('volume_descuento1')
                ->comment('Segundo tramo % sobre neto (API descuento2; default 10 si null)');
            $table->timestamp('volume_discounts_synced_at')->nullable()->after('volume_descuento2');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['volume_descuento1', 'volume_descuento2', 'volume_discounts_synced_at']);
        });
    }
};
