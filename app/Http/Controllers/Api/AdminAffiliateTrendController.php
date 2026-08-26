<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateTrend;

class AdminAffiliateTrendController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliateTrend::class;
    protected $resourceKey = 'trend';
    protected $imageDir = 'images/affiliate-trends';

    protected $fields = [
        'title' => 'required|string|max:255',
        'button_url' => 'required|string|max:500',
        'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];
}