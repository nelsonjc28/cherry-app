<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $faqs = [
            [
                'question' => '¿Cómo empiezo a vender los productos de Cherry?',
                'answer' => 'Solo tienes que afiliarte como distribuidora, acceder a nuestros catálogos y precios especiales de mayoreo, y empezar a ofrecer los productos a tus clientes. Nosotros te damos la asesoría para arrancar.',
                'display_order' => 1,
            ],
            [
                'question' => '¿Necesito experiencia previa para ser distribuidora?',
                'answer' => 'No, no se requiere experiencia. Cualquier persona puede unirse; tú decides cómo y cuándo vender, y te acompañamos con asesoría personalizada durante el proceso.',
                'display_order' => 2,
            ],
            [
                'question' => '¿Qué productos puedo encontrar en los catálogos?',
                'answer' => 'Ropa y calzado para dama: vestidos, blusas, pantalones, faldas, conjuntos, sacos, chamarras, entre otros, con modelos nuevos de forma constante según la temporada.',
                'display_order' => 3,
            ],
            [
                'question' => '¿Cómo obtengo el catálogo y los precios de mayoreo?',
                'answer' => 'Al afiliarte tienes acceso exclusivo a los catálogos completos y a precios especiales de mayoreo, distintos a los de venta al público.',
                'display_order' => 4,
            ],
            [
                'question' => '¿Cuánto puedo ganar vendiendo con Cherry?',
                'answer' => 'Tus ingresos dependen de tu ritmo de venta y dedicación; al comprar a precio de mayoreo y vender al público, tú defines tu margen de ganancia por producto.',
                'display_order' => 5,
            ],
        ];

        foreach ($faqs as $faq) {
            DB::table('affiliate_faqs')->updateOrInsert(
                ['question' => $faq['question']],
                array_merge($faq, [
                    'is_active' => true,
                    'updated_at' => now(),
                ])
            );
        }
    }

    public function down(): void
    {
        DB::table('affiliate_faqs')->whereIn('question', [
            '¿Cómo empiezo a vender los productos de Cherry?',
            '¿Necesito experiencia previa para ser distribuidora?',
            '¿Qué productos puedo encontrar en los catálogos?',
            '¿Cómo obtengo el catálogo y los precios de mayoreo?',
            '¿Cuánto puedo ganar vendiendo con Cherry?',
        ])->delete();
    }
};