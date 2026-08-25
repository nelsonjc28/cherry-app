<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateBanner;

class AdminAffiliateBannerController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliateBanner::class;
    protected $resourceKey = 'banner';
    protected $imageDir = 'images/affiliate-banners';
    protected $imageFields = ['image_path'];

    protected $fields = [
        'title' => 'required|string|max:255',
        'subtitle' => 'required|string',
        'button_text' => 'required|string|max:255',
        'button_url' => 'required|string|max:500',
        'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];
}