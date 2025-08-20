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
        Schema::create('catalog_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_id')->constrained()->onDelete('cascade');
            $table->string('external_product_id'); // ID del producto de la API externa
            $table->string('product_name');
            $table->text('product_description')->nullable();
            $table->string('product_image')->nullable();
            $table->decimal('product_price', 10, 2)->nullable();
            $table->string('product_category')->nullable();
            $table->json('product_metadata')->nullable(); // Datos adicionales del producto
            $table->integer('display_order')->default(0);
            $table->timestamps();
            
            // Un producto solo puede estar en un catálogo
            $table->unique('external_product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_products');
    }
};
