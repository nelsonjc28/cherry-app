<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Address;

class AddressSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener el primer usuario (asumiendo que existe)
        $user = User::first();
        
        if (!$user) {
            $this->command->info('No se encontraron usuarios. Ejecuta UserSeeder primero.');
            return;
        }

        // Crear direcciones de ejemplo
        $addresses = [
            [
                'name' => 'Casa',
                'street_address' => 'Av. Reforma 123',
                'city' => 'Ciudad de México',
                'state' => 'CDMX',
                'postal_code' => '06000',
                'country' => 'México',
                'additional_info' => 'Entre Insurgentes y Chapultepec',
                'is_default' => true,
            ],
            [
                'name' => 'Trabajo',
                'street_address' => 'Paseo de la Reforma 456',
                'city' => 'Ciudad de México',
                'state' => 'CDMX',
                'postal_code' => '06500',
                'country' => 'México',
                'additional_info' => 'Edificio Torre Mayor, Piso 15',
                'is_default' => false,
            ],
            [
                'name' => 'Casa de Verano',
                'street_address' => 'Calle del Mar 789',
                'city' => 'Acapulco',
                'state' => 'Guerrero',
                'postal_code' => '39300',
                'country' => 'México',
                'additional_info' => 'Frente al mar, cerca del malecón',
                'is_default' => false,
            ],
        ];

        foreach ($addresses as $addressData) {
            Address::create(array_merge($addressData, ['user_id' => $user->id]));
        }

        $this->command->info('Direcciones de ejemplo creadas correctamente.');
    }
}

