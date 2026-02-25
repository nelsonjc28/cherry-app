<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN seller_category ENUM('bronce', 'oro', 'diamante') DEFAULT 'bronce'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN seller_category ENUM('bronce', 'oro') DEFAULT 'bronce'");
    }
};
