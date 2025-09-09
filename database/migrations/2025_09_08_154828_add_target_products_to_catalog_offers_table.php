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
            $table->json('target_products')->nullable()->after('min_purchase_amount');
            $table->json('target_users')->nullable()->after('target_products');
            $table->string('discount_category')->default('product_discount')->after('discount_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->dropColumn(['target_products', 'target_users', 'discount_category']);
        });
    }
};
