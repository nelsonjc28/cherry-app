@props(['url'])
@if (trim($slot ?? '') !== '')
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{!! $slot !!}
</a>
</td>
</tr>
@endif
