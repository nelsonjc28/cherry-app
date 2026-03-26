<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function storeDirectOrder(Request $request, PaymentController $paymentController)
    {
        return $paymentController->createDirectOrder($request);
    }
}
