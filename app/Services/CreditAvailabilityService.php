<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Cupo de crédito: límite vs crédito ya comprometido en pedidos activos.
 * No usar solo credit_balance del usuario como única fuente (puede desincronizarse).
 */
class CreditAvailabilityService
{
    /**
     * Estados donde el credit_used del pedido sigue comprometiendo cupo (no cancelado / no rechazado).
     */
    public const COMMITTED_CREDIT_STATUSES = [
        'pending',
        'pendiente_pago',
        'pagado',
        'en_espera_envio',
        'enviado',
        'processing',
        'completed',
    ];

    /**
     * Suma de credit_used en pedidos del usuario que aún comprometen el límite.
     */
    public function sumCommittedCredit(int $userId): float
    {
        $sum = Order::query()
            ->where('user_id', $userId)
            ->where('paid_with_credit', true)
            ->where('credit_used', '>', 0)
            ->whereIn('status', self::COMMITTED_CREDIT_STATUSES)
            ->sum('credit_used');

        return round((float) $sum, 2);
    }

    /**
     * Cupo disponible según límite menos compromisos (no usa credit_balance).
     */
    public function availableFromLimit(?User $user): float
    {
        if (!$user) {
            return 0.0;
        }

        $limit = $user->credit_limit;

        if ($limit === null || (float) $limit <= 0) {
            return 0.0;
        }

        $committed = $this->sumCommittedCredit((int) $user->id);

        return max(0.0, round((float) $limit - $committed, 2));
    }

    /**
     * Valida un nuevo pedido con crédito antes de persistir.
     *
     * @return array{ok: bool, message: string|null, credit_limit: float, credit_committed: float, credit_available: float, credit_to_use: float, amount_pending: float, amount_exceeded: float|null}
     */
    public function validateNewCreditOrder(
        User $user,
        float $totalAmount,
        bool $payRemainderWithMercadoPago
    ): array {
        $totalAmount = round(max(0, $totalAmount), 2);

        $limitRaw = $user->credit_limit;
        if ($limitRaw === null || (float) $limitRaw <= 0) {
            return [
                'ok' => false,
                'message' => 'No tienes línea de crédito asignada o el límite es cero. No puedes pagar con crédito. Contacta a administración.',
                'credit_limit' => 0.0,
                'credit_committed' => $this->sumCommittedCredit((int) $user->id),
                'credit_available' => 0.0,
                'credit_to_use' => 0.0,
                'amount_pending' => $totalAmount,
                'amount_exceeded' => null,
            ];
        }

        $creditLimit = round((float) $limitRaw, 2);
        $committed = $this->sumCommittedCredit((int) $user->id);
        $availableMath = max(0.0, round($creditLimit - $committed, 2));

        // Cupo teórico vs saldo mostrado en perfil: si credit_balance es menor, es lo que el cliente “ve” y debe generar saldo MP.
        $available = $availableMath;
        if ($user->credit_balance !== null) {
            $balanceShown = round(max(0.0, (float) $user->credit_balance), 2);
            if ($balanceShown > 0 && $balanceShown + 0.005 < $availableMath) {
                $available = $balanceShown;
                Log::info('Cupo ajustado por credit_balance del usuario (menor que límite−comprometido)', [
                    'available_math' => $availableMath,
                    'credit_balance' => $balanceShown,
                    'available_usado' => $available,
                ]);
            }
        }

        $creditToUse = min($totalAmount, $available);
        $amountPending = max(0.0, round($totalAmount - $creditToUse, 2));

        Log::info('Validación crédito nuevo pedido', [
            'total_pedido' => $totalAmount,
            'credito_aplicado' => round($creditToUse, 2),
            'monto_pendiente_mercadopago' => round($amountPending, 2),
            'cupo_disponible' => round($available, 2),
            'cupo_por_limite' => round($availableMath, 2),
            'limite' => round($creditLimit, 2),
            'comprometido' => round($committed, 2),
            'credit_balance_raw' => $user->credit_balance,
        ]);

        // Sin cupo aplicable al total: solo Mercado Pago (split con una sola orden de pago)
        if ($creditToUse <= 0 && $totalAmount > 0) {
            return [
                'ok' => true,
                'message' => null,
                'credit_limit' => $creditLimit,
                'credit_committed' => $committed,
                'credit_available' => $available,
                'credit_to_use' => 0.0,
                'amount_pending' => $totalAmount,
                'amount_exceeded' => null,
            ];
        }

        // Parte en crédito y parte pendiente: siempre se crea segunda orden con Mercado Pago (no se bloquea por el flag)

        // Estricto: comprometido + uso propuesto no debe superar límite (por redondeos)
        if ($committed + $creditToUse - $creditLimit > 0.01) {
            return [
                'ok' => false,
                'message' => sprintf(
                    'Excedes tu límite de crédito. Límite: $%s. Comprometido en otros pedidos: $%s. Intentas usar: $%s.',
                    number_format($creditLimit, 2, '.', ','),
                    number_format($committed, 2, '.', ','),
                    number_format($creditToUse, 2, '.', ',')
                ),
                'credit_limit' => $creditLimit,
                'credit_committed' => $committed,
                'credit_available' => $available,
                'credit_to_use' => $creditToUse,
                'amount_pending' => $amountPending,
                'amount_exceeded' => round(($committed + $creditToUse) - $creditLimit, 2),
            ];
        }

        return [
            'ok' => true,
            'message' => null,
            'credit_limit' => $creditLimit,
            'credit_committed' => $committed,
            'credit_available' => $available,
            'credit_to_use' => $creditToUse,
            'amount_pending' => $amountPending,
            'amount_exceeded' => null,
        ];
    }

    /**
     * Recalcula credit_balance del usuario como límite - comprometido (alineado con credit:recalculate).
     */
    public function syncCreditBalanceFromOrders(User $user): void
    {
        if (! in_array($user->seller_category, ['oro', 'diamante'], true)) {
            return;
        }

        if ($user->credit_limit === null || (float) $user->credit_limit <= 0) {
            return;
        }

        $committed = $this->sumCommittedCredit((int) $user->id);
        $newBalance = max(0.0, round((float) $user->credit_limit - $committed, 2));

        if ((float) ($user->credit_balance ?? 0) !== $newBalance) {
            $user->credit_balance = $newBalance;
            $user->save();
        }
    }
}
