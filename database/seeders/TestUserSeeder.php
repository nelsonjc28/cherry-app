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

        // Create cliente users
        $clienteUsers = [
            [
                'email' => 'cliente@cherrycentral.com',
                'first_name' => 'Cliente',
                'last_name' => 'User',
                'middle_name' => 'Test',
                'phone' => '5559876543',
                'password' => 'Cliente1234!',
            ],
            [
                'email' => 'maria.garcia@cherrycentral.com',
                'first_name' => 'María',
                'last_name' => 'García',
                'middle_name' => 'López',
                'phone' => '5551112233',
                'password' => 'Cliente1234!',
            ],
            [
                'email' => 'juan.rodriguez@cherrycentral.com',
                'first_name' => 'Juan',
                'last_name' => 'Rodríguez',
                'middle_name' => 'Martínez',
                'phone' => '5552223344',
                'password' => 'Cliente1234!',
            ],
            [
                'email' => 'ana.martinez@cherrycentral.com',
                'first_name' => 'Ana',
                'last_name' => 'Martínez',
                'middle_name' => 'González',
                'phone' => '5553334455',
                'password' => 'Cliente1234!',
            ],
            [
                'email' => 'carlos.lopez@cherrycentral.com',
                'first_name' => 'Carlos',
                'last_name' => 'López',
                'middle_name' => 'Hernández',
                'phone' => '5554445566',
                'password' => 'Cliente1234!',
            ],
            [
                'email' => 'laura.gonzalez@cherrycentral.com',
                'first_name' => 'Laura',
                'last_name' => 'González',
                'middle_name' => 'Pérez',
                'phone' => '5555556677',
                'password' => 'Cliente1234!',
            ]
        ];

        foreach ($clienteUsers as $userData) {
            User::updateOrCreate(
                [ 'email' => $userData['email'] ],
                [
                    'first_name' => $userData['first_name'],
                    'last_name' => $userData['last_name'],
                    'middle_name' => $userData['middle_name'],
                    'phone' => $userData['phone'],
                    'password' => Hash::make($userData['password']),
                    'role_id' => 2, // cliente role
                ]
            );
        }
    }
}
