<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Producto disponible</title>
    <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; background: #f4f4f5; }
        .wrap { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
        .card { background: #fff; border-radius: 12px; padding: 28px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 8px; color: #111; }
        .lead { margin: 0 0 20px; color: #52525b; font-size: 0.95rem; }
        .product-name { font-size: 1.35rem; font-weight: 700; color: #18181b; margin: 0 0 16px; line-height: 1.3; }
        .img-wrap { text-align: center; margin: 0 0 20px; }
        .img-wrap img { max-width: 100%; height: auto; max-height: 280px; border-radius: 8px; background: #fafafa; }
        .price-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: .06em; color: #71717a; margin-bottom: 4px; }
        .price { font-size: 1.25rem; font-weight: 600; color: #18181b; margin-bottom: 24px; }
        .btn { display: inline-block; background: #18181b; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; }
        .btn-wrap { margin: 8px 0 0; }
        .foot { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 0.8rem; color: #a1a1aa; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <h1>¡Hola{{ $userFirstName !== '' && $userFirstName !== 'Cliente' ? ', '.$userFirstName : '' }}!</h1>
        <p class="lead">El producto que esperabas ya cuenta con inventario.</p>

        <p class="product-name">{{ $productName }}</p>

        @if($productImageUrl !== '')
        <div class="img-wrap">
            <img src="{{ $productImageUrl }}" alt="">
        </div>
        @endif

        <div class="price-label">Precio de lista</div>
        <div class="price">{{ $listPriceFormatted }}</div>

        <div class="btn-wrap">
            <a class="btn" href="{{ $productDetailUrl }}" target="_blank" rel="noopener noreferrer">Ver producto</a>
        </div>

        <p class="foot">{{ config('app.name') }}</p>
    </div>
</div>
</body>
</html>
