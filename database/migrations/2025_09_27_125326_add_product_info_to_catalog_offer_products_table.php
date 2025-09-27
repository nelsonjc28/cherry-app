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
        Schema::table('catalog_offer_products', function (Blueprint $table) {
            // Agregar campos para almacenar información del producto
            $table->string('product_name')->nullable()->after('product_id');
            $table->decimal('product_price', 10, 2)->nullable()->after('product_name');
            $table->string('product_image')->nullable()->after('product_price');
            $table->text('product_description')->nullable()->after('product_image');
            
            // Índice para búsquedas por nombre
            $table->index('product_name', 'idx_product_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offer_products', function (Blueprint $table) {
            // Eliminar índice primero
            $table->dropIndex('idx_product_name');
            
            // Eliminar campos
            $table->dropColumn([
                'product_name',
                'product_price', 
                'product_image',
                'product_description'
            ]);
        });
    }
};
