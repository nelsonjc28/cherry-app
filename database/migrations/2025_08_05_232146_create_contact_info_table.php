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
        Schema::create('contact_info', function (Blueprint $table) {
            $table->id();
            $table->string('address_street')->nullable();
            $table->string('address_city')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('map_url')->nullable();
            $table->json('store_hours')->nullable();
            $table->json('online_hours')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_info');
    }
};
