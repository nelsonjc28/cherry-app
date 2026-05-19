<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('external_api_sent')->default(false)->after('payment_data');
            $table->timestamp('external_api_sent_at')->nullable()->after('external_api_sent');
            $table->index('external_api_sent');
        });

        // Migrar flag histórico desde payment_data JSON
        DB::table('orders')
            ->whereNotNull('payment_data')
            ->orderBy('id')
            ->chunkById(200, function ($orders) {
                foreach ($orders as $order) {
                    $paymentData = json_decode($order->payment_data, true);
                    if (! is_array($paymentData) || empty($paymentData['external_api_sent'])) {
                        continue;
                    }

                    $sentAt = $paymentData['external_api_sent_at'] ?? null;
                    DB::table('orders')->where('id', $order->id)->update([
                        'external_api_sent' => true,
                        'external_api_sent_at' => $sentAt ? date('Y-m-d H:i:s', strtotime($sentAt)) : now(),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['external_api_sent']);
            $table->dropColumn(['external_api_sent', 'external_api_sent_at']);
        });
    }
};
