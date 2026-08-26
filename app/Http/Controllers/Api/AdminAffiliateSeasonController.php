<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateSeason;
use App\Models\Catalog;
use Illuminate\Http\JsonResponse;

class AdminAffiliateSeasonController extends Controller
{
    use AffiliateCrudTrait;

    protected $modelClass = AffiliateSeason::class;
    protected $resourceKey = 'season';
    protected $imageDir = 'images/affiliate-seasons';

    protected $fields = [
        'title' => 'required|string|max:255',
        'button_url' => 'nullable|url|max:500',
        'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp',
        'is_active' => 'boolean',
        'display_order' => 'nullable|integer|min:0'
    ];

    /**
     * Listar catálogos disponibles para asociar a la temporada.
     */
    public function catalogs(): JsonResponse
    {
        try {
            $catalogs = Catalog::where('is_active', true)
                ->orderBy('name', 'ASC')
                ->get(['id', 'name', 'code']);
            return response()->json(['success' => true, 'catalogs' => $catalogs]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Error: ' . $e->getMessage()], 500);
        }
    }
}