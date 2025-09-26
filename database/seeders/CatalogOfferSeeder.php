<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\CatalogOffer;
use Carbon\Carbon;

class CatalogOfferSeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        // Crear algunos descuentos de ejemplo para testing
        
        // Descuento general del 10% para todos los productos
        CatalogOffer::create([
            'catalog_id' => 1,
            'title' => 'Descuento General 10%',
            'description' => 'Descuento del 10% en todos los productos para usuarios registrados',
            'discount_percentage' => 10.00,
            'discount_type' => 'percentage',
            'discount_category' => 'product_discount',
            'start_date' => Carbon::now(),
            'end_date' => Carbon::now()->addMonths(3),
            'is_active' => true,
            'display_order' => 1,
            'max_uses' => null,
            'current_uses' => 0,
            'min_purchase_amount' => null,
            'max_discount_amount' => null,
            'target_products' => [], // Vacío = todos los productos
            'target_users' => [] // Vacío = todos los usuarios
        ]);

        // Descuento VIP del 20% para usuarios específicos
        CatalogOffer::create([
            'catalog_id' => 1,
            'title' => 'VIP 20% OFF',
            'description' => 'Descuento exclusivo del 20% para clientes VIP',
            'discount_percentage' => 20.00,
            'discount_type' => 'percentage',
            'discount_category' => 'product_discount',
            'start_date' => Carbon::now(),
            'end_date' => Carbon::now()->addMonths(6),
            'is_active' => true,
            'display_order' => 2,
            'max_uses' => null,
            'current_uses' => 0,
            'min_purchase_amount' => 500.00,
            'max_discount_amount' => 1000.00,
            'target_products' => [], // Todos los productos
            'target_users' => [1, 2, 3] // Solo usuarios con ID 1, 2, 3
        ]);

        // Descuento en productos específicos del 15%
        CatalogOffer::create([
            'catalog_id' => 1,
            'title' => 'Productos Seleccionados 15%',
            'description' => 'Descuento del 15% en productos seleccionados',
            'discount_percentage' => 15.00,
            'discount_type' => 'percentage',
            'discount_category' => 'product_discount',
            'start_date' => Carbon::now(),
            'end_date' => Carbon::now()->addMonths(2),
            'is_active' => true,
            'display_order' => 3,
            'max_uses' => 1000,
            'current_uses' => 0,
            'min_purchase_amount' => null,
            'max_discount_amount' => null,
            'target_products' => ['404182010111', '404182010112', '404182010113'], // Productos específicos
            'target_users' => [] // Todos los usuarios
        ]);
    }
}


