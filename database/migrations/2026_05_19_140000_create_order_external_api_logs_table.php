<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_external_api_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->string('estado', 20)->default('error');
            $table->longText('respuesta_api');
            $table->string('origen', 32)->default('sistema');
            $table->timestamp('ejecutado_at');
            $table->timestamps();

            $table->index(['ejecutado_at', 'id']);
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_external_api_logs');
    }
};
