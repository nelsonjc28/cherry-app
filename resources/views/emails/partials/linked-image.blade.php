@if(!empty($clickUrl))
<a href="{{ $clickUrl }}" target="_blank" rel="noopener" style="text-decoration:none;display:block;">
  <img src="{{ $imageUrl }}" alt="{{ $alt ?? '' }}" @if(!empty($width)) width="{{ $width }}" @endif style="{{ $style ?? 'display:block;width:100%;height:auto;border:0;' }}">
</a>
@else
<img src="{{ $imageUrl }}" alt="{{ $alt ?? '' }}" @if(!empty($width)) width="{{ $width }}" @endif style="{{ $style ?? 'display:block;width:100%;height:auto;border:0;' }}">
@endif
