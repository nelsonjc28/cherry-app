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
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('product_id'); // ID del producto de Shopify
            $table->integer('rating')->comment('Calificación de 1 a 5 estrellas');
            $table->text('comment')->nullable()->comment('Comentario opcional');
            $table->boolean('is_approved')->default(true);
            $table->timestamps();
            
            // Índices para optimizar consultas
            $table->unique(['user_id', 'product_id']);
            $table->index(['user_id']);
            $table->index(['product_id']);
            $table->index(['rating']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
