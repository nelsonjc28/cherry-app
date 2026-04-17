<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

/**
 * API de órdenes: la creación de pedidos y estados iniciales viven en {@see PaymentController}
 * (p. ej. `createDirectOrder`, `create-preference` con crédito / Mercado Pago).
 */
class OrderController extends Controller
{
    public function storeDirectOrder(Request $request, PaymentController $paymentController)
    {
        return $paymentController->createDirectOrder($request);
    }
}
