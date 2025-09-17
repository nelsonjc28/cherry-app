<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Catalog;

class CatalogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $catalogs = [
            [
                'code' => '0',
                'name' => 'Sin Catálogo',
                'description' => 'Productos sin catálogo asignado',
                'image' => '/images/RecentCatalogs/default.png',
                'is_active' => true,
                'display_order' => 1
            ],
            [
                'code' => '1',
                'name' => 'Catalogo-2017-1',
                'description' => 'Primera edición del catálogo para el año 2017',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 2
            ],
            [
                'code' => '2',
                'name' => 'Catalogo-2017-2',
                'description' => 'Segunda edición del catálogo para el año 2017',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 3
            ],
            [
                'code' => '3',
                'name' => 'Catalogo-2017-3',
                'description' => 'Tercera edición del catálogo para el año 2017',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 4
            ],
            [
                'code' => '4',
                'name' => 'Catalogo-2017-4',
                'description' => 'Cuarta edición del catálogo para el año 2017',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 5
            ],
            [
                'code' => '5',
                'name' => 'Catalogo-2017-5',
                'description' => 'Quinta edición del catálogo para el año 2017',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 6
            ],
            [
                'code' => '6',
                'name' => 'Catalogo-2018-1',
                'description' => 'Primera edición del catálogo para el año 2018',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 7
            ],
            [
                'code' => '7',
                'name' => 'Catalogo-2018-2',
                'description' => 'Segunda edición del catálogo para el año 2018',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 8
            ],
            [
                'code' => '8',
                'name' => 'Catalogo-2018-3',
                'description' => 'Tercera edición del catálogo para el año 2018',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 9
            ],
            [
                'code' => '9',
                'name' => 'Catalogo-2018-4',
                'description' => 'Cuarta edición del catálogo para el año 2018',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 10
            ],
            [
                'code' => '10',
                'name' => 'Catalogo-2018-5',
                'description' => 'Quinta edición del catálogo para el año 2018',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 11
            ],
            [
                'code' => '11',
                'name' => 'Catalogo-2019-1',
                'description' => 'Primera edición del catálogo para el año 2019',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 12
            ],
            [
                'code' => '12',
                'name' => 'Catalogo-2019-2',
                'description' => 'Segunda edición del catálogo para el año 2019',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 13
            ],
            [
                'code' => '13',
                'name' => 'Catalogo-2019-3',
                'description' => 'Tercera edición del catálogo para el año 2019',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 14
            ],
            [
                'code' => '14',
                'name' => 'Catalogo-2019-4',
                'description' => 'Cuarta edición del catálogo para el año 2019',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 15
            ],
            [
                'code' => '15',
                'name' => 'Catalogo-2019-5',
                'description' => 'Quinta edición del catálogo para el año 2019',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 16
            ],
            [
                'code' => '16',
                'name' => 'Catalogo-2020-1',
                'description' => 'Primera edición del catálogo para el año 2020',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 17
            ],
            [
                'code' => '17',
                'name' => 'Catalogo-2020-2',
                'description' => 'Segunda edición del catálogo para el año 2020',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 18
            ],
            [
                'code' => '39',
                'name' => 'Catalogo-2020-3',
                'description' => 'Tercera edición del catálogo para el año 2020',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 19
            ],
            [
                'code' => '43',
                'name' => 'Catalogo-2021-1',
                'description' => 'Primera edición del catálogo para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 20
            ],
            [
                'code' => '44',
                'name' => 'Catalogo-2021-2',
                'description' => 'Segunda edición del catálogo para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 21
            ],
            [
                'code' => '45',
                'name' => 'Catalogo-2021-3',
                'description' => 'Tercera edición del catálogo para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 22
            ],
            [
                'code' => '48',
                'name' => 'Catalogo-2021-4',
                'description' => 'Cuarta edición del catálogo para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 23
            ],
            [
                'code' => '49',
                'name' => 'PRONTO-MODA-2021',
                'description' => 'Catálogo PRONTO-MODA para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 24
            ],
            [
                'code' => '50',
                'name' => 'FOLEYS-2021',
                'description' => 'Catálogo FOLEYS para el año 2021',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 25
            ],
            [
                'code' => '51',
                'name' => 'EX CATALOGO VIRTUAL',
                'description' => 'Catálogo virtual exclusivo',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 26
            ],
            [
                'code' => '52',
                'name' => 'Catalogo-2022-1',
                'description' => 'Primera edición del catálogo para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 27
            ],
            [
                'code' => '53',
                'name' => 'Catalogo-2022-2',
                'description' => 'Segunda edición del catálogo para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 28
            ],
            [
                'code' => '54',
                'name' => 'FOLEY´S-P-V-2022',
                'description' => 'Catálogo FOLEY´S Primavera-Verano 2022',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 29
            ],
            [
                'code' => '55',
                'name' => 'Catalogo-2022-3',
                'description' => 'Tercera edición del catálogo para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 30
            ],
            [
                'code' => '56',
                'name' => 'PRONTO-MODA-2022',
                'description' => 'Catálogo PRONTO-MODA para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 31
            ],
            [
                'code' => '57',
                'name' => 'Catalogo-2022-4',
                'description' => 'Cuarta edición del catálogo para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 32
            ],
            [
                'code' => '58',
                'name' => 'Catalogo-2022-5',
                'description' => 'Quinta edición del catálogo para el año 2022',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 33
            ],
            [
                'code' => '59',
                'name' => 'FOLEY´S-OTO-INV-2022',
                'description' => 'Catálogo FOLEY´S Otoño-Invierno 2022',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 34
            ],
            [
                'code' => '60',
                'name' => 'Catalogo-2023-1',
                'description' => 'Primera edición del catálogo para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 35
            ],
            [
                'code' => '61',
                'name' => 'Catalogo-2023-2',
                'description' => 'Segunda edición del catálogo para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 36
            ],
            [
                'code' => '62',
                'name' => 'FOLEY´S-PRIMAVERA-2023',
                'description' => 'Catálogo FOLEY´S Primavera 2023',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 37
            ],
            [
                'code' => '63',
                'name' => 'Catalogo-2023-3',
                'description' => 'Tercera edición del catálogo para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 38
            ],
            [
                'code' => '64',
                'name' => 'Catalogo-2023-4',
                'description' => 'Cuarta edición del catálogo para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 39
            ],
            [
                'code' => '65',
                'name' => 'KAREN-KEIN-2023',
                'description' => 'Catálogo KAREN-KEIN para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 40
            ],
            [
                'code' => '66',
                'name' => 'Catalogo-2023-5',
                'description' => 'Quinta edición del catálogo para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 41
            ],
            [
                'code' => '68',
                'name' => 'FOLEY´S-OTO-INV-2023',
                'description' => 'Catálogo FOLEY´S Otoño-Invierno 2023',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => false,
                'display_order' => 42
            ],
            [
                'code' => '71',
                'name' => 'SHYLA-ALYSH-2023',
                'description' => 'Catálogo SHYLA-ALYSH para el año 2023',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => false,
                'display_order' => 43
            ],
            [
                'code' => '72',
                'name' => 'Catalogo-2024-1',
                'description' => 'Primera edición del catálogo para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 44
            ],
            [
                'code' => '73',
                'name' => 'Catalogo-2024-2',
                'description' => 'Segunda edición del catálogo para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 45
            ],
            [
                'code' => '74',
                'name' => 'FOLEYS-PRIMAVERA-2024',
                'description' => 'Catálogo FOLEYS Primavera 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 46
            ],
            [
                'code' => '75',
                'name' => 'CRITERIA Primavera 2024',
                'description' => 'Catálogo CRITERIA Primavera 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 47
            ],
            [
                'code' => '76',
                'name' => 'CHERRY 2024 - 3',
                'description' => 'Tercera edición del catálogo CHERRY para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 48
            ],
            [
                'code' => '77',
                'name' => 'SHYLA 2024',
                'description' => 'Catálogo SHYLA para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 49
            ],
            [
                'code' => '78',
                'name' => 'CHERRY 2024 - 4',
                'description' => 'Cuarta edición del catálogo CHERRY para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 50
            ],
            [
                'code' => '79',
                'name' => 'CHERRY 2024 - 5',
                'description' => 'Quinta edición del catálogo CHERRY para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 51
            ],
            [
                'code' => '80',
                'name' => 'Virtual On Line',
                'description' => 'Catálogo Virtual On Line con acceso abierto',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 52
            ],
            [
                'code' => '82',
                'name' => 'CIRAGAN-2024',
                'description' => 'Catálogo CIRAGAN para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 53
            ],
            [
                'code' => '83',
                'name' => 'FOLEY´S-OTO-INV-2024',
                'description' => 'Catálogo FOLEY´S Otoño-Invierno 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 54
            ],
            [
                'code' => '84',
                'name' => 'CRITERIA Otoño-Invierno 2024',
                'description' => 'Catálogo CRITERIA Otoño-Invierno 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 55
            ],
            [
                'code' => '85',
                'name' => 'SHYLA-2024',
                'description' => 'Catálogo SHYLA para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 56
            ],
            [
                'code' => '86',
                'name' => 'ALYSH-2024',
                'description' => 'Catálogo ALYSH para el año 2024',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 57
            ],
            [
                'code' => '87',
                'name' => 'CHERRY 2025 - 1',
                'description' => 'Primera edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 58
            ],
            [
                'code' => '88',
                'name' => 'FOLEY´S Primavera Verano 2025',
                'description' => 'Catálogo FOLEY´S Primavera Verano 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 59
            ],
            [
                'code' => '89',
                'name' => 'CHERRY 2025 - 2',
                'description' => 'Segunda edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 60
            ],
            [
                'code' => '90',
                'name' => 'CHERRY 2025 - 3',
                'description' => 'Tercera edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 61
            ],
            [
                'code' => '91',
                'name' => 'CRITERIA Primavera 2025',
                'description' => 'Catálogo CRITERIA Primavera 2025',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 62
            ],
            [
                'code' => '92',
                'name' => 'CHERRY 2025 - 4',
                'description' => 'Cuarta edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 63
            ],
            [
                'code' => '93',
                'name' => 'CHERRY 2025 - 5',
                'description' => 'Quinta edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 64
            ],
            [
                'code' => '94',
                'name' => 'SHYLA - 2025',
                'description' => 'Catálogo SHYLA para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 65
            ],
            [
                'code' => '95',
                'name' => 'FOLEY´S Otoño-Invierno 2025',
                'description' => 'Catálogo FOLEY´S Otoño-Invierno 2025',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 66
            ],
            [
                'code' => '96',
                'name' => 'CRITERIA Otoño-Invierno 2025',
                'description' => 'Catálogo CRITERIA Otoño-Invierno 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 67
            ],
            [
                'code' => '97',
                'name' => 'CHERRY 2026 - 1',
                'description' => 'Primera edición del catálogo CHERRY para el año 2026',
                'image' => '/images/RecentCatalogs/image_example_1.png',
                'is_active' => true,
                'display_order' => 68
            ],
            [
                'code' => '98',
                'name' => 'CHERRY 2025 - 6',
                'description' => 'Sexta edición del catálogo CHERRY para el año 2025',
                'image' => '/images/RecentCatalogs/image_example_2.png',
                'is_active' => true,
                'display_order' => 69
            ]
        ];

        foreach ($catalogs as $catalogData) {
            Catalog::updateOrCreate(
                ['code' => $catalogData['code']],
                $catalogData
            );
        }

        $this->command->info('Catálogos creados exitosamente!');
    }
}
