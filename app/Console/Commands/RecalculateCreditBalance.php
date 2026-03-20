<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Order;
use App\Services\CreditAvailabilityService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RecalculateCreditBalance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'credit:recalculate {--user-id= : Recalcular solo para un usuario específico}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalcula el crédito disponible basándose en las órdenes existentes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->option('user-id');
        
        $this->info('🔄 Recalculando crédito disponible...');
        
        $query = User::whereIn('seller_category', ['oro', 'diamante'])
            ->whereNotNull('credit_limit')
            ->where('credit_limit', '>', 0);
        
        if ($userId) {
            $query->where('id', $userId);
        }
        
        $users = $query->get();
        
        if ($users->isEmpty()) {
            $this->warn('⚠️  No se encontraron usuarios con crédito asignado.');
            return 0;
        }
        
        $this->info("📊 Encontrados {$users->count()} usuario(s) con crédito asignado.");
        $this->newLine();
        
        $totalUpdated = 0;
        $totalCreditRestored = 0;
        
        foreach ($users as $user) {
            $this->line("👤 Usuario ID: {$user->id} - {$user->name}");
            $this->line("   Límite de crédito: $" . number_format($user->credit_limit, 2));
            
            // Calcular cuánto crédito se ha usado en órdenes existentes
            // Solo contar órdenes que están pagadas o pendientes de pago (no canceladas)
            $creditUsed = Order::where('user_id', $user->id)
                ->where('paid_with_credit', true)
                ->where('credit_used', '>', 0)
                ->whereIn('status', CreditAvailabilityService::COMMITTED_CREDIT_STATUSES)
                ->sum('credit_used');
            
            $creditUsed = (float) $creditUsed;
            
            // El crédito disponible es el límite menos lo usado
            $newCreditBalance = max(0, (float) $user->credit_limit - $creditUsed);
            
            $oldCreditBalance = (float) ($user->credit_balance ?? 0);
            $difference = $newCreditBalance - $oldCreditBalance;
            
            $this->line("   Crédito usado en órdenes: $" . number_format($creditUsed, 2));
            $this->line("   Crédito disponible anterior: $" . number_format($oldCreditBalance, 2));
            $this->line("   Crédito disponible nuevo: $" . number_format($newCreditBalance, 2));
            
            if ($difference != 0) {
                $this->line("   📈 Diferencia: $" . number_format($difference, 2) . ($difference > 0 ? ' (restaurado)' : ' (ajustado)'));
                
                $user->credit_balance = $newCreditBalance;
                $user->save();
                
                $totalUpdated++;
                if ($difference > 0) {
                    $totalCreditRestored += $difference;
                }
                
                Log::info('Crédito recalculado para usuario', [
                    'user_id' => $user->id,
                    'credit_limit' => $user->credit_limit,
                    'credit_used' => $creditUsed,
                    'old_credit_balance' => $oldCreditBalance,
                    'new_credit_balance' => $newCreditBalance,
                    'difference' => $difference
                ]);
            } else {
                $this->line("   ✅ Sin cambios necesarios");
            }
            
            $this->newLine();
        }
        
        $this->info("✅ Proceso completado!");
        $this->info("   Usuarios actualizados: {$totalUpdated}");
        if ($totalCreditRestored > 0) {
            $this->info("   Crédito total restaurado: $" . number_format($totalCreditRestored, 2));
        }
        
        return 0;
    }
}
