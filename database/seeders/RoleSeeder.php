<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rows = [
            [
                'id' => 1,
                'name' => 'admin',
                'description' => 'Administrador del sistema',
            ],
            [
                'id' => 2,
                'name' => 'cliente',
                'description' => 'Cliente regular',
            ],
        ];
        $now = now();
        foreach ($rows as $row) {
            DB::table('roles')->updateOrInsert(
                ['id' => $row['id']],
                array_merge($row, ['created_at' => $now, 'updated_at' => $now])
            );
        }
    }
}
