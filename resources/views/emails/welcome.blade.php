<x-mail::message>
# ¡Bienvenido/a, {{ $user->first_name }}!

Gracias por registrarte en **{{ config('app.name') }}**.

Ya puedes explorar el catálogo, armar tu carrito y disfrutar de las promociones pensadas para ti.

<x-mail::button :url="config('app.url')">
Ir a la tienda
</x-mail::button>

Si no creaste esta cuenta, puedes ignorar este mensaje.

Saludos,<br>
{{ config('app.name') }}
</x-mail::message>
