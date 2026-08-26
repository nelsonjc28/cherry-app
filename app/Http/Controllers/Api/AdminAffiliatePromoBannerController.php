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
        'button_url' => 'required|string|max:500',
        'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];
}