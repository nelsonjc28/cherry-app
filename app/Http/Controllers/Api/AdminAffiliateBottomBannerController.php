<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateBottomBanner;

class AdminAffiliateBottomBannerController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliateBottomBanner::class;
    protected $resourceKey = 'bottom_banner';
    protected $imageDir = 'images/affiliate-bottom-banners';

    protected $fields = [
        'button_url' => 'required|string|max:500',
        'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean'
    ];
}
