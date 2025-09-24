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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'payment_received', 'order_status_changed', etc.
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable(); // Datos adicionales (order_id, user_id, etc.)
            $table->boolean('is_read')->default(false);
            $table->string('target_user_role')->default('admin'); // 'admin' or 'user'
            $table->unsignedBigInteger('target_user_id')->nullable(); // Para notificaciones específicas de usuario
            $table->unsignedBigInteger('related_order_id')->nullable(); // ID de la orden relacionada
            $table->timestamps();

            $table->index(['target_user_role', 'is_read']);
            $table->index(['target_user_id', 'is_read']);
            $table->index(['related_order_id']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
