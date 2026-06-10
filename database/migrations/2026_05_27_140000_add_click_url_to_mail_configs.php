<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mail_configs', function (Blueprint $table) {
            $table->string('click_url', 2048)->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('mail_configs', function (Blueprint $table) {
            $table->dropColumn('click_url');
        });
    }
};
