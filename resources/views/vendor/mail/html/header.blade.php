@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{{-- Sin logo por defecto de Laravel: siempre el contenido del slot (nombre de la app o HTML propio) --}}
{!! $slot !!}
</a>
</td>
</tr>
