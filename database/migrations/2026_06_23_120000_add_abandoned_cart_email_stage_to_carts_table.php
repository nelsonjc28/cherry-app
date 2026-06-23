<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->unsignedTinyInteger('abandoned_email_stage')
                ->default(0)
                ->after('last_notified_at')
                ->comment('Recordatorios enviados (0-6): 3h, 1d, 3d, 1sem, 2sem, 1mes');
            $table->timestamp('abandonment_started_at')
                ->nullable()
                ->after('abandoned_email_stage')
                ->comment('Inicio de la secuencia actual (se reinicia al vaciar el carrito)');
        });
    }

    public function down(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->dropColumn(['abandoned_email_stage', 'abandonment_started_at']);
        });
    }
};
