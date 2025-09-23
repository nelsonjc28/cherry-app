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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('address_id')->constrained()->onDelete('cascade');
            $table->decimal('total_amount', 10, 2);
            $table->string('status')->default('pending'); // pending, processing, completed, failed, cancelled
            $table->string('payment_method')->default('mercadopago');
            $table->string('external_reference')->unique();
            $table->string('mercadopago_preference_id')->nullable();
            $table->string('mercadopago_payment_id')->nullable();
            $table->json('payment_data')->nullable();
            $table->timestamps();
            
            // Índices para búsquedas eficientes
            $table->index(['user_id', 'status']);
            $table->index('external_reference');
            $table->index('mercadopago_preference_id');
            $table->index('mercadopago_payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
