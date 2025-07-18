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
        // Create admin user
        User::updateOrCreate(
            [ 'email' => 'admin@cherrycentral.com' ],
            [
                'first_name' => 'Admin',
                'last_name' => 'User',
                'middle_name' => 'System',
                'phone' => '5551234567',
                'password' => Hash::make('Admin1234!'),
                'role_id' => 1, // admin role
            ]
        );

        // Create cliente user
        User::updateOrCreate(
            [ 'email' => 'cliente@cherrycentral.com' ],
            [
                'first_name' => 'Cliente',
                'last_name' => 'User',
                'middle_name' => 'Test',
                'phone' => '5559876543',
                'password' => Hash::make('Cliente1234!'),
                'role_id' => 2, // cliente role
            ]
        );
    }
}
