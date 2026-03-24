<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->timestamp('last_notified_at')->nullable()->after('discount');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('welcome_sent')->default(false)->after('remember_token');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('fulfillment_email_last_status', 50)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->dropColumn('last_notified_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('welcome_sent');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('fulfillment_email_last_status');
        });
    }
};
