<?php

namespace App\Services;

use App\Models\Order;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OrderSharePdfService
{
    public function __construct(
        private readonly OrderPrintViewDataBuilder $printDataBuilder
    ) {}

    /**
     * Genera y guarda el PDF de compartir para el grupo de checkout (idempotente).
     */
    public function ensureStoredForOrder(Order $order): void
    {
        try {
            $order->refresh();
            $group = $this->resolveCheckoutGroupOrders($order);

            foreach ($group as $groupOrder) {
                if (! empty($groupOrder->share_pdf_path)
                    && Storage::disk('public')->exists($groupOrder->share_pdf_path)) {
                    $this->syncGroupPdfPaths($group, $groupOrder->share_pdf_path, $groupOrder->share_pdf_name);

                    return;
                }
            }

            $rendered = $this->renderPdfForGroup($group);
            $storedPath = $this->storePdf($rendered['content'], $rendered['filename']);
            $this->syncGroupPdfPaths($group, $storedPath, $rendered['filename']);

            Log::info('PDF de compartir pedido generado', [
                'anchor_order_id' => $order->id,
                'path' => $storedPath,
                'group_order_ids' => $group->pluck('id')->all(),
            ]);
        } catch (\Throwable $e) {
            Log::error('No se pudo generar PDF de compartir para pedido', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return Collection<int, Order>
     */
    public function resolveCheckoutGroupOrders(Order $order): Collection
    {
        $userId = (int) $order->user_id;

        if (! empty($order->order_group_id)) {
            $group = Order::query()
                ->where('user_id', $userId)
                ->where('order_group_id', $order->order_group_id)
                ->with(['items', 'address', 'user'])
                ->orderBy('id')
                ->get();
            if ($group->count() > 1) {
                return $group;
            }
        }

        $pd = $order->payment_data;
        if (is_string($pd)) {
            $pd = json_decode($pd, true) ?? [];
        }
        $pd = is_array($pd) ? $pd : [];

        $extraIds = [];
        if (! empty($pd['order_group_sibling_ids']) && is_array($pd['order_group_sibling_ids'])) {
            foreach ($pd['order_group_sibling_ids'] as $sid) {
                $i = (int) $sid;
                if ($i > 0) {
                    $extraIds[] = $i;
                }
            }
        }
        if (! empty($pd['order_group_sibling_id'])) {
            $i = (int) $pd['order_group_sibling_id'];
            if ($i > 0) {
                $extraIds[] = $i;
            }
        }
        if (! empty($pd['split_paired_order_id'])) {
            $i = (int) $pd['split_paired_order_id'];
            if ($i > 0) {
                $extraIds[] = $i;
            }
        }

        $extraIds = array_values(array_unique($extraIds));
        $allIds = array_values(array_unique(array_merge([(int) $order->id], $extraIds)));

        if (count($allIds) <= 1) {
            if (! $order->relationLoaded('items')) {
                $order->load(['items', 'address', 'user']);
            }

            return collect([$order]);
        }

        $group = Order::query()
            ->where('user_id', $userId)
            ->whereIn('id', $allIds)
            ->with(['items', 'address', 'user'])
            ->orderBy('id')
            ->get();

        return $group->count() > 1 ? $group : collect([$order->loadMissing(['items', 'address', 'user'])]);
    }

    /**
     * @param  Collection<int, Order>  $group
     * @return array{content: string, filename: string}
     */
    public function renderPdfForGroup(Collection $group): array
    {
        $orderSections = [];
        foreach ($group as $groupOrder) {
            $orderSections[] = $this->printDataBuilder->buildSection($groupOrder);
        }

        $isSplit = count($orderSections) > 1;
        $combinedTotal = array_sum(array_column($orderSections, 'totalAmount'));
        $combinedPieces = array_sum(array_column($orderSections, 'totalPieces'));
        $orderNumbers = array_column($orderSections, 'orderNumber');
        $filename = $isSplit
            ? 'pedidos-'.implode('-', $orderNumbers).'.pdf'
            : 'pedido-'.$orderNumbers[0].'.pdf';

        $html = view('orders.print-pdf', [
            'orderSections' => $orderSections,
            'isSplit' => $isSplit,
            'combinedTotal' => $combinedTotal,
            'combinedPieces' => $combinedPieces,
        ])->render();

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Arial');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return [
            'content' => $dompdf->output(),
            'filename' => $filename,
        ];
    }

    private function storePdf(string $content, string $filename): string
    {
        $safeName = preg_replace('/[^\w.\-]/', '_', $filename) ?: 'pedido.pdf';
        $storageName = uniqid('order_', true).'_'.$safeName;
        $relativePath = 'orders/pdfs/'.$storageName;

        Storage::disk('public')->put($relativePath, $content);

        return $relativePath;
    }

    /**
     * @param  Collection<int, Order>  $group
     */
    private function syncGroupPdfPaths(Collection $group, string $path, ?string $filename): void
    {
        $now = now();
        foreach ($group as $groupOrder) {
            $groupOrder->forceFill([
                'share_pdf_path' => $path,
                'share_pdf_name' => $filename,
                'share_pdf_generated_at' => $now,
            ])->save();
        }
    }
}
