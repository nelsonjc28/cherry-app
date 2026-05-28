<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('share_pdf_path')->nullable()->after('external_api_sent_at');
            $table->string('share_pdf_name')->nullable()->after('share_pdf_path');
            $table->timestamp('share_pdf_generated_at')->nullable()->after('share_pdf_name');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['share_pdf_path', 'share_pdf_name', 'share_pdf_generated_at']);
        });
    }
};
