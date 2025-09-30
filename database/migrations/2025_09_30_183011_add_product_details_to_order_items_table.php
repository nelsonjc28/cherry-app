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
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('size')->nullable()->after('name'); // Talla
            $table->string('color')->nullable()->after('size'); // Color
            $table->string('barcode')->nullable()->after('color'); // Código de barras
            $table->text('product_details')->nullable()->after('barcode'); // Detalles adicionales del producto (JSON)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['size', 'color', 'barcode', 'product_details']);
        });
    }
};
