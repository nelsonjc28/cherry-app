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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('order_id');
            $table->bigInteger('product_id'); // ID del producto externo
            $table->string('product_name')->nullable(); // Nombre del producto al momento de la reseña
            $table->integer('rating')->unsigned(); // 1-5 estrellas
            $table->text('comment')->nullable();
            $table->json('images')->nullable(); // URLs de las imágenes subidas
            $table->boolean('is_approved')->default(true); // Para moderación
            $table->boolean('is_featured')->default(false); // Para destacar reseñas
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            
            $table->index(['product_id']);
            $table->index(['rating']);
            $table->index(['is_approved']);
            $table->index(['created_at']);
            
            // Un usuario solo puede hacer una reseña por producto por orden
            $table->unique(['user_id', 'order_id', 'product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
