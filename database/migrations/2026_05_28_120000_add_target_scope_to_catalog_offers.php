<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->string('target_scope', 32)->default('products')->after('discount_category');
            $table->string('target_category_code', 64)->nullable()->after('target_scope');
            $table->string('target_catalog_id', 64)->nullable()->after('target_category_code');
        });
    }

    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->dropColumn(['target_scope', 'target_category_code', 'target_catalog_id']);
        });
    }
};
