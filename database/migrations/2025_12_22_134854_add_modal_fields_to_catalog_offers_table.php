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
            $table->string('modal_image')->nullable()->after('banner_image');
            $table->text('modal_text')->nullable()->after('modal_image');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('catalog_offers', function (Blueprint $table) {
            $table->dropColumn(['modal_image', 'modal_text']);
        });
    }
};
