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
        Schema::table('welcome_sections', function (Blueprint $table) {
            $table->text('title')->change();
            $table->string('title_color', 7)->default('#EA2630')->after('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('welcome_sections', function (Blueprint $table) {
            $table->dropColumn('title_color');
            $table->string('title', 255)->change();
        });
    }
};
