<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get sales data by month for line chart
     */
    public function getSalesByMonth(Request $request)
    {
        try {
            $startDate = $request->get('start_date', now()->subMonths(11)->startOfMonth());
            $endDate = $request->get('end_date', now()->endOfMonth());

            // Convertir strings a Carbon si es necesario
            if (is_string($startDate)) {
                $startDate = Carbon::parse($startDate)->startOfMonth();
            }
            if (is_string($endDate)) {
                $endDate = Carbon::parse($endDate)->endOfMonth();
            }

            // Obtener ventas agrupadas por mes
            $sales = Order::select(
                    DB::raw('YEAR(created_at) as year'),
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('SUM(total_amount) as total_sales'),
                    DB::raw('COUNT(*) as total_orders')
                )
                ->where('status', '!=', 'cancelled')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('year', 'month')
                ->orderBy('year', 'asc')
                ->orderBy('month', 'asc')
                ->get();

            // Formatear datos para el gráfico
            $chartData = [];
            $labels = [];

            foreach ($sales as $sale) {
                $monthName = Carbon::createFromDate($sale->year, $sale->month, 1)->format('M Y');
                $labels[] = $monthName;
                $chartData[] = [
                    'month' => $monthName,
                    'year' => $sale->year,
                    'month_number' => $sale->month,
                    'total_sales' => (float) $sale->total_sales,
                    'total_orders' => $sale->total_orders
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $chartData,
                'labels' => $labels,
                'period' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener datos de ventas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get top selling products for bar chart
     */
    public function getTopSellingProducts(Request $request)
    {
        try {
            $startDate = $request->get('start_date', now()->startOfMonth());
            $endDate = $request->get('end_date', now()->endOfMonth());
            $limit = $request->get('limit', 10);

            // Convertir strings a Carbon si es necesario
            if (is_string($startDate)) {
                $startDate = Carbon::parse($startDate)->startOfDay();
            }
            if (is_string($endDate)) {
                $endDate = Carbon::parse($endDate)->endOfDay();
            }

            // Obtener productos más vendidos
            $topProducts = OrderItem::select(
                    'order_items.name as product_name',
                    'order_items.product_id',
                    DB::raw('SUM(order_items.quantity) as total_quantity'),
                    DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue'),
                    DB::raw('COUNT(DISTINCT orders.id) as total_orders')
                )
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.status', '!=', 'cancelled')
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->groupBy('order_items.product_id', 'order_items.name')
                ->orderBy('total_quantity', 'desc')
                ->limit($limit)
                ->get();

            // Formatear datos para el gráfico
            $chartData = [];
            $labels = [];

            foreach ($topProducts as $product) {
                $productName = $product->product_name ?: "Producto #{$product->product_id}";
                $labels[] = $productName;
                $chartData[] = [
                    'product_id' => $product->product_id,
                    'product_name' => $productName,
                    'total_quantity' => $product->total_quantity,
                    'total_revenue' => (float) $product->total_revenue,
                    'total_orders' => $product->total_orders,
                    'average_price' => $product->total_quantity > 0 ? 
                        (float) ($product->total_revenue / $product->total_quantity) : 0
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $chartData,
                'labels' => $labels,
                'period' => [
                    'start' => $startDate->format('Y-m-d'),
                    'end' => $endDate->format('Y-m-d')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener productos más vendidos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard summary statistics
     */
    public function getDashboardSummary(Request $request)
    {
        try {
            $startDate = $request->get('start_date', now()->startOfMonth());
            $endDate = $request->get('end_date', now()->endOfMonth());

            // Convertir strings a Carbon si es necesario
            if (is_string($startDate)) {
                $startDate = Carbon::parse($startDate)->startOfDay();
            }
            if (is_string($endDate)) {
                $endDate = Carbon::parse($endDate)->endOfDay();
            }

            // Estadísticas generales
            $totalSales = Order::where('status', '!=', 'cancelled')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->sum('total_amount');

            $totalOrders = Order::where('status', '!=', 'cancelled')
                ->whereBetween('created_at', [$startDate, $endDate])
                ->count();

            $totalProducts = OrderItem::join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.status', '!=', 'cancelled')
                ->whereBetween('orders.created_at', [$startDate, $endDate])
                ->sum('order_items.quantity');

            $averageOrderValue = $totalOrders > 0 ? $totalSales / $totalOrders : 0;

            // Comparación con período anterior
            $periodDays = $startDate->diffInDays($endDate) + 1;
            $previousStartDate = $startDate->copy()->subDays($periodDays);
            $previousEndDate = $startDate->copy()->subDay();

            $previousSales = Order::where('status', '!=', 'cancelled')
                ->whereBetween('created_at', [$previousStartDate, $previousEndDate])
                ->sum('total_amount');

            $salesGrowth = $previousSales > 0 ? 
                (($totalSales - $previousSales) / $previousSales) * 100 : 
                ($totalSales > 0 ? 100 : 0);

            return response()->json([
                'success' => true,
                'data' => [
                    'total_sales' => (float) $totalSales,
                    'total_orders' => $totalOrders,
                    'total_products_sold' => $totalProducts,
                    'average_order_value' => (float) $averageOrderValue,
                    'sales_growth_percentage' => (float) $salesGrowth,
                    'period' => [
                        'start' => $startDate->format('Y-m-d'),
                        'end' => $endDate->format('Y-m-d'),
                        'days' => $periodDays
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener resumen del dashboard: ' . $e->getMessage()
            ], 500);
        }
    }
}
