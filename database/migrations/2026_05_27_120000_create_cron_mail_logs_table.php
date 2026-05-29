<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cron_mail_logs', function (Blueprint $table) {
            $table->id();
            $table->string('comando', 64);
            $table->string('tipo_correo', 32);
            $table->string('estado', 20)->default('error');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cart_id')->nullable()->constrained('carts')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('email_destino', 255)->nullable();
            $table->longText('mensaje')->nullable();
            $table->string('origen', 32)->default('comando');
            $table->timestamp('ejecutado_at');
            $table->timestamps();

            $table->index(['ejecutado_at', 'id']);
            $table->index('comando');
            $table->index('estado');
            $table->index('order_id');
            $table->index('cart_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cron_mail_logs');
    }
};
