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
        Schema::create('recent_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('product_id'); // ID del producto (id_articulo)
            $table->timestamps();
            
            // Índices para optimizar consultas
            $table->unique(['user_id', 'product_id']);
            $table->index(['user_id']);
            $table->index(['product_id']);
            $table->index('updated_at'); // Para ordenar por fecha
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recent_products');
    }
};
