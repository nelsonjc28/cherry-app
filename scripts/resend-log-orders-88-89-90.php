<?php

/**
 * Reenvío manual de PD0088, PD0089 y PD0090 desde payloads del laravel.log (2026-05-18).
 * Uso: php scripts/resend-log-orders-88-89-90.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$url = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/789/venta';

$orders = [
    'PD0088' => '{"id_pedido":17791352090088,"numero_pedido":88,"nombre_pedido":"PD0088","fecha":"2026-05-18T14:13:29","pago":{"external_reference":17791352090088,"fecha_pago":"2026-05-18T14:13:29","tipoPago":"MP"},"cliente":{"id":"DM00109","nombre":"Martha patricia Martínez  Gómez","rfc":"XAXX010101000","calle":"Pisco","no_int":null,"no_ext":"610","municipio":"Gustavo A. Madero","colonia":null,"estado":"Ciudad de México","ciudad":"Lindavista Norte","pais":"México","codpos":"07300","contacto1":null,"telefono1":"5518151569","email1":"patuleka09@gmail.com","metodopago":"99","numctapago":"0000","opccredito":"N","id_uso":"G01","id_metpago":"PPD","telefono":"5518151569","email":"patuleka09@gmail.com"},"metodoEnvio":"ENVIO A DOMICILIO","decto1":30,"impoDecto1":1121.4,"refDecto1":null,"decto2":10,"impoDecto2":261.66,"decto3":0,"impoDecto3":0,"descuento1":30,"descuento2":10,"importeNeto":2354.94,"descuentos":1383.06,"importeTotal":3738,"costoEnvio":150,"items":[{"idArtd":141325,"idArticulo":"47632604101","cantidad":1,"precio":1869,"descuento":0,"opcDecto":"N","talla":"34","nombreColor":"AZUL"},{"idArtd":141321,"idArticulo":"47632604101","cantidad":1,"precio":1869,"descuento":0,"opcDecto":"N","talla":"34","nombreColor":"ROSA"}],"importeFinal":2504.94}',
    'PD0089' => '{"id_pedido":17791352540089,"numero_pedido":89,"nombre_pedido":"PD0089","fecha":"2026-05-18T14:14:14","pago":{"external_reference":17791352540089,"fecha_pago":"2026-05-18T14:14:14","tipoPago":"MP"},"cliente":{"id":"DM00109","nombre":"Martha patricia Martínez  Gómez","rfc":"XAXX010101000","calle":"Pisco","no_int":null,"no_ext":"610","municipio":"Gustavo A. Madero","colonia":null,"estado":"Ciudad de México","ciudad":"Lindavista Norte","pais":"México","codpos":"07300","contacto1":null,"telefono1":"5518151569","email1":"patuleka09@gmail.com","metodopago":"99","numctapago":"0000","opccredito":"N","id_uso":"G01","id_metpago":"PPD","telefono":"5518151569","email":"patuleka09@gmail.com"},"metodoEnvio":"ENVIO A DOMICILIO","decto1":30,"impoDecto1":560.7,"refDecto1":null,"decto2":10,"impoDecto2":130.83,"decto3":0,"impoDecto3":0,"descuento1":30,"descuento2":10,"importeNeto":1177.47,"descuentos":691.53,"importeTotal":1869,"costoEnvio":150,"items":[{"idArtd":141321,"idArticulo":"47632604101","cantidad":1,"precio":1869,"descuento":0,"opcDecto":"N","talla":"34","nombreColor":"ROSA"}],"importeFinal":1327.47}',
    'PD0090' => '{"id_pedido":17791369960090,"numero_pedido":90,"nombre_pedido":"PD0090","fecha":"2026-05-18T14:43:16","pago":{"external_reference":17791369960090,"fecha_pago":"2026-05-18T14:43:16","tipoPago":"MP"},"cliente":{"id":"DM00102","nombre":"María de los Angeles Muciño Sabath","rfc":"XAXX010101000","calle":"Zimapán","no_int":null,"no_ext":"175","municipio":"Tula de Allende","colonia":null,"estado":"Hidalgo","ciudad":"San Miguel Vindhó","pais":"México","codpos":"42842","contacto1":null,"telefono1":"7731106755","email1":"marymucino14@icloud.com","metodopago":"99","numctapago":"0000","opccredito":"N","id_uso":"G01","id_metpago":"PPD","telefono":"7731106755","email":"marymucino14@icloud.com"},"metodoEnvio":"ENVIO A DOMICILIO","decto1":30,"impoDecto1":3606.3,"refDecto1":null,"decto2":10,"impoDecto2":841.47,"decto3":0,"impoDecto3":0,"descuento1":30,"descuento2":10,"importeNeto":7573.23,"descuentos":4447.77,"importeTotal":12021,"costoEnvio":0,"items":[{"idArtd":137125,"idArticulo":"1560290904","cantidad":1,"precio":749,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"BLANCO"},{"idArtd":137137,"idArticulo":"1560290904","cantidad":1,"precio":749,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"GRIS"},{"idArtd":140661,"idArticulo":"1763214606","cantidad":1,"precio":949,"descuento":0,"opcDecto":"N","talla":"13","nombreColor":"REY"},{"idArtd":141262,"idArticulo":"57638037413","cantidad":1,"precio":1899,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"NEGRO"},{"idArtd":141243,"idArticulo":"57638026913","cantidad":1,"precio":1999,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"AMARILLO"},{"idArtd":141266,"idArticulo":"57638038413","cantidad":1,"precio":1999,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"JADE"},{"idArtd":141092,"idArticulo":"2363783306","cantidad":1,"precio":679,"descuento":0,"opcDecto":"N","talla":"36","nombreColor":"VERDE"},{"idArtd":141087,"idArticulo":"2363252604","cantidad":1,"precio":799,"descuento":0,"opcDecto":"N","talla":"36","nombreColor":"VERDE"},{"idArtd":141278,"idArticulo":"57638027313","cantidad":1,"precio":2199,"descuento":0,"opcDecto":"N","talla":"G","nombreColor":"FIUSHA"}],"importeFinal":7573.23}',
];

foreach ($orders as $label => $json) {
    $payload = json_decode($json, true);
    echo "Enviando {$label} (id_pedido={$payload['id_pedido']})...\n";

    $response = Illuminate\Support\Facades\Http::timeout(30)
        ->withoutVerifying()
        ->withHeaders(['Content-Type' => 'application/json', 'Accept' => 'application/json'])
        ->post($url, $payload);

    $status = $response->status();
    $body = $response->body();

    if ($response->successful()) {
        echo "  OK HTTP {$status}: {$body}\n\n";
    } else {
        echo "  ERROR HTTP {$status}: {$body}\n\n";
    }
}

echo "Listo.\n";
