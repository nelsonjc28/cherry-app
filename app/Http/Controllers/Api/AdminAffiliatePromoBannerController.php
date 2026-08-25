<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliatePromoBanner;

class AdminAffiliatePromoBannerController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliatePromoBanner::class;
    protected $resourceKey = 'banner';
    protected $imageDir = 'images/affiliate-promo-banners';

    protected $fields = [
        'title' => 'required|string|max:255',
        'description' => 'required|string',
        'button_text' => 'nullable|string|max:255',
        'button_url' => 'nullable|string|max:500',
        'start_date' => 'nullable|date',
        'end_date' => 'nullable|date|after_or_equal:start_date',
        'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];
}