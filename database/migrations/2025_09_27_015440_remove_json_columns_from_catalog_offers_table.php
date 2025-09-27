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
        Schema::table('catalog_offers', function (Blueprint $table) {
            // Remove JSON columns after data migration
            $table->dropColumn(['target_products', 'target_users']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            // Restore JSON columns if needed
            $table->json('target_products')->nullable();
            $table->json('target_users')->nullable();
        });
    }
};
