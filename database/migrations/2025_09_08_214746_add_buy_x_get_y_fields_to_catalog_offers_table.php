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
            if (!Schema::hasColumn('catalog_offers', 'buy_quantity')) {
                $table->integer('buy_quantity')->nullable()->after('min_purchase_amount');
            }
            if (!Schema::hasColumn('catalog_offers', 'get_quantity')) {
                $table->integer('get_quantity')->nullable()->after('buy_quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->dropColumn(['buy_quantity', 'get_quantity']);
        });
    }
};
