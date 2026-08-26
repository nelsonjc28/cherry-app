<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('affiliate_promo_banners', function (Blueprint $table) {
            $table->dropColumn(['title', 'description', 'button_text', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::table('affiliate_promo_banners', function (Blueprint $table) {
            $table->string('title', 255)->nullable()->after('image_path');
            $table->text('description')->nullable()->after('title');
            $table->string('button_text', 255)->nullable()->after('description');
            $table->date('start_date')->nullable()->after('button_text');
            $table->date('end_date')->nullable()->after('start_date');
        });
    }
};
