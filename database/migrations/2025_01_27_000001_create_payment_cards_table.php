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
        Schema::create('payment_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('cardholder_name');
            $table->string('card_number'); // Encriptado
            $table->string('expiry_month');
            $table->string('expiry_year');
            $table->string('cvv'); // Encriptado
            $table->string('brand'); // visa, mastercard, amex, etc.
            $table->string('last_four'); // Últimos 4 dígitos para mostrar
            $table->string('first_two'); // Primeros 2 dígitos para mostrar
            $table->string('card_type'); // credit, debit
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Índices para búsquedas eficientes
            $table->index(['user_id', 'is_active']);
            $table->index(['user_id', 'is_default']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_cards');
    }
};

















