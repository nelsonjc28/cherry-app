<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class TestUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            [ 'email' => 'testuser@example.com' ],
            [
                'first_name' => 'Test',
                'last_name' => 'User',
                'middle_name' => 'Example',
                'phone' => '5551234567',
                'password' => Hash::make('Test1234!'),
            ]
        );
    }
}
