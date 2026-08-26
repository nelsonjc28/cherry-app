<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffiliateBanner;
use App\Models\AffiliateBottomBanner;
use App\Models\AffiliateFaq;
use App\Models\AffiliatePromoBanner;
use App\Models\AffiliateSeason;
use App\Models\AffiliateTrend;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PublicAffiliateContentController extends Controller
{
    /**
     * Obtener todo el contenido dinámico del módulo de afiliación:
     * banner superior, sección temporada con recuadros, banners
     * promocionales vigentes y preguntas frecuentes activas.
     */
    public function index(): JsonResponse
    {
        try {
            $banner = AffiliateBanner::getActiveBanner();

            $season = AffiliateSeason::getActiveSeason();
            if ($season) {
                $season->load(['catalog', 'activeBoxes']);
            }

            $promoBanners = AffiliatePromoBanner::getActivePromoBanners();
            $bottomBanner = AffiliateBottomBanner::getActiveBottomBanner();
            $faqs = AffiliateFaq::getActiveFaqs();
            $trends = AffiliateTrend::active()->ordered()->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'banner' => $banner,
                    'season' => $season,
                    'promo_banners' => $promoBanners,
                    'bottom_banner' => $bottomBanner,
                    'faqs' => $faqs,
                    'trends' => $trends
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error al obtener contenido de afiliación: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener contenido de afiliación: ' . $e->getMessage()
            ], 500);
        }
    }
}