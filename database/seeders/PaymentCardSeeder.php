<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\PaymentCard;
use Illuminate\Support\Facades\Hash;

class PaymentCardSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar el primer usuario
        $user = User::first();
        
        if (!$user) {
            $this->command->info('No hay usuarios en la base de datos. Ejecuta UserSeeder primero.');
            return;
        }

        // Crear tarjetas de ejemplo
        $cards = [
            [
                'cardholder_name' => 'Juan Pérez',
                'card_number' => Hash::make('4111111111111111'),
                'expiry_month' => '12',
                'expiry_year' => '2028',
                'cvv' => Hash::make('123'),
                'brand' => 'visa',
                'first_two' => '41',
                'last_four' => '1111',
                'card_type' => 'credit',
                'is_default' => true,
                'is_active' => true
            ],
            [
                'cardholder_name' => 'Juan Pérez',
                'card_number' => Hash::make('5555555555554444'),
                'expiry_month' => '10',
                'expiry_year' => '2029',
                'cvv' => Hash::make('456'),
                'brand' => 'mastercard',
                'first_two' => '55',
                'last_four' => '4444',
                'card_type' => 'debit',
                'is_default' => false,
                'is_active' => true
            ],
            [
                'cardholder_name' => 'Juan Pérez',
                'card_number' => Hash::make('378282246310005'),
                'expiry_month' => '08',
                'expiry_year' => '2027',
                'cvv' => Hash::make('789'),
                'brand' => 'amex',
                'first_two' => '37',
                'last_four' => '0005',
                'card_type' => 'credit',
                'is_default' => false,
                'is_active' => true
            ]
        ];

        foreach ($cards as $cardData) {
            PaymentCard::create(array_merge($cardData, ['user_id' => $user->id]));
        }

        $this->command->info('Tarjetas de pago de ejemplo creadas correctamente.');
    }
}





















