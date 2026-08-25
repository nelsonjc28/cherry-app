<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateFaq;

class AdminAffiliateFaqController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliateFaq::class;
    protected $resourceKey = 'faq';

    protected $fields = [
        'question' => 'required|string|max:255',
        'answer' => 'required|string',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];
}