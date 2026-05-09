@php
    $__respondIoGrowth = config('services.respond_io', []);
    /** Misma intención que config: activo por defecto (evita caché .env antigua sin esta clave → antes quedaba en false y no salía el script). */
    $__respondIoGrowthEnabled = filter_var($__respondIoGrowth['growth_tool_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $__respondIoGrowthWid = trim((string) ($__respondIoGrowth['growth_tool_wid'] ?? 'fef1dbec-7474-4fcb-8761-a89344af5ff1'));
@endphp
@if ($__respondIoGrowthEnabled && $__respondIoGrowthWid !== '')
    <!-- This site is converting visitors into subscribers and customers with https://respond.io -->
    <script async id="respondio__growth_tool" src="https://cdn.respond.io/widget/widget.js?wId={{ rawurlencode($__respondIoGrowthWid) }}"></script>
    <!-- https://respond.io -->
@endif
