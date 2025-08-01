<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Contact;

class ContactSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contacts = [
            [
                'type' => 'phone',
                'title' => 'Teléfono',
                'value' => '+52 (55) 1234-5678',
                'description' => 'Lun - Vie: 9:00 AM - 6:00 PM',
                'icon' => 'Phone.svg',
                'is_active' => true,
                'order' => 1
            ],
            [
                'type' => 'whatsapp',
                'title' => 'WhatsApp',
                'value' => '+52 (55) 1234-5678',
                'description' => 'Respuesta en menos de 1 hora',
                'icon' => 'Whatsapp.svg',
                'is_active' => true,
                'order' => 2
            ],
            [
                'type' => 'email',
                'title' => 'Email',
                'value' => 'info@cherrycentral.com',
                'description' => 'soporte@cherrycentral.com',
                'icon' => 'File Alt.svg',
                'is_active' => true,
                'order' => 3
            ],
            [
                'type' => 'address',
                'title' => 'Dirección',
                'value' => 'José María Izazaga 127 piso 2 Col. Centro, México DFCP 06080',
                'description' => 'Oficina principal',
                'icon' => 'Map Marker.svg',
                'is_active' => true,
                'order' => 4
            ],
            [
                'type' => 'phone',
                'title' => 'Teléfono Oficina',
                'value' => '55-5542-4442 al 45',
                'description' => 'Horario de atención',
                'icon' => 'Phone.svg',
                'is_active' => true,
                'order' => 5
            ],
            [
                'type' => 'email',
                'title' => 'Email Oficial',
                'value' => 'cherryonline@cherry.com.mx',
                'description' => 'Correo electrónico oficial',
                'icon' => 'File Alt.svg',
                'is_active' => true,
                'order' => 6
            ]
        ];

        foreach ($contacts as $contactData) {
            Contact::updateOrCreate(
                ['type' => $contactData['type'], 'title' => $contactData['title']],
                $contactData
            );
        }
    }
}
