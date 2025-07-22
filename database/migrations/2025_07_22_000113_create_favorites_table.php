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
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('product_id'); // ID del producto de Shopify
            $table->string('product_title')->nullable();
            $table->string('product_image')->nullable();
            $table->decimal('product_price', 10, 2)->nullable();
            $table->timestamps();
            
            // Índices para optimizar consultas
            $table->unique(['user_id', 'product_id']);
            $table->index(['user_id']);
            $table->index(['product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
