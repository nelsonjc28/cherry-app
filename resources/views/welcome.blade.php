@php
    $rio = config('services.respond_io', []);
    $rioGrowthOn = filter_var($rio['growth_tool_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $rioGrowthWid = trim((string) ($rio['growth_tool_wid'] ?? 'fef1dbec-7474-4fcb-8761-a89344af5ff1'));
    $rioGrowthSrc = ($rioGrowthOn && $rioGrowthWid !== '')
        ? 'https://cdn.respond.io/widget/widget.js?wId=' . rawurlencode($rioGrowthWid)
        : null;
@endphp
<!DOCTYPE html>
<html lang="en">

    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>Cherry-app</title>
    @if ($rioGrowthSrc)
        <meta name="respond-io-growth-src" content="{{ $rioGrowthSrc }}">
    @endif
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
    </head>

<body>
    <div id="root"></div>
    </body>

</html>
