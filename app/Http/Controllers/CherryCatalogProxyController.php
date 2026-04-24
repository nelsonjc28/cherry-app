<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class CherryCatalogProxyController extends BaseController
{
    public function __invoke(Request $request, $path = null)
    {
        $path = is_string($path) ? ltrim($path, '/') : '';
        $base = rtrim(config('cherry.catalog_api_upstream', 'https://cherryapi.estrategiadmgs.com.mx/cherryApi'), '/');
        $url = $path === '' ? $base . '/' : $base . '/' . $path;
        if ($q = $request->getQueryString()) {
            $url .= (Str::contains($url, '?') ? '&' : '?') . $q;
        }
        if (strtoupper($request->getMethod()) === 'OPTIONS') {
            return response('', 204);
        }

        try {
            $response = $this->forward($request, $url);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'No se pudo conectar con el catálogo externo.',
            ], 502, ['Content-Type' => 'application/json; charset=utf-8']);
        }
        $contentType = $response->header('Content-Type') ?? 'application/json; charset=utf-8';

        return response($response->body(), $response->status(), [
            'Content-Type' => $contentType,
        ]);
    }

    private function forward(Request $request, string $url): Response
    {
        $http = Http::timeout(120)->connectTimeout(30);
        $method = strtoupper($request->getMethod());
        $ct = (string) $request->header('Content-Type', 'application/json');
        $body = $request->getContent();

        return match ($method) {
            'GET' => $http->get($url),
            'HEAD' => $http->head($url),
            'POST' => $http->withBody($body, $ct)->post($url),
            'PUT' => $http->withBody($body, $ct)->put($url),
            'PATCH' => $http->withBody($body, $ct)->patch($url),
            'DELETE' => $http->delete($url),
            default => $http->get($url),
        };
    }
}
