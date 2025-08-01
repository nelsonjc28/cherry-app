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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // phone, email, whatsapp, address, social
            $table->string('title'); // Teléfono, Email, WhatsApp, Dirección, etc.
            $table->text('value'); // El valor del contacto (número, email, dirección, etc.)
            $table->text('description')->nullable(); // Descripción adicional (horarios, etc.)
            $table->string('icon')->nullable(); // Nombre del icono a mostrar
            $table->boolean('is_active')->default(true); // Si está activo o no
            $table->integer('order')->default(0); // Orden de aparición
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
