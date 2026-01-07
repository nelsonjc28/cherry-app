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
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('credit_used', 10, 2)->default(0)->after('total_amount');
            $table->decimal('amount_paid', 10, 2)->default(0)->after('credit_used');
            $table->decimal('amount_pending', 10, 2)->default(0)->after('amount_paid');
            $table->boolean('paid_with_credit')->default(false)->after('amount_pending');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['credit_used', 'amount_paid', 'amount_pending', 'paid_with_credit']);
        });
    }
};
