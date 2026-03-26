<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class DegradeExpiredSellerCategoriesCommand extends Command
{
    protected $signature = 'users:degrade-expired-seller-categories';

    protected $description = 'Degrada categoría oro/diamante si venció categoria_expires_at (45 días sin compra)';

    public function handle(): int
    {
        $now = now();

        $count = 0;
        $expiredBronzeBenefits = 0;

        User::query()
            ->whereNotNull('categoria_expires_at')
            ->where('categoria_expires_at', '<', $now)
            ->where(function ($q) {
                $q->whereRaw('LOWER(seller_category) = ?', ['diamante'])
                    ->orWhereRaw('LOWER(seller_category) = ?', ['oro']);
            })
            ->orderBy('id')
            ->chunkById(100, function ($users) use (&$count) {
                foreach ($users as $user) {
                    /** @var User $user */
                    if (! $user->categoria_expires_at || $user->categoria_expires_at->gte(now())) {
                        continue;
                    }

                    $cat = strtolower((string) ($user->seller_category ?? ''));
                    $previous = $cat;

                    if ($cat === 'diamante') {
                        $user->seller_category = 'oro';
                    } elseif ($cat === 'oro') {
                        $user->seller_category = 'bronce';
                    } else {
                        continue;
                    }

                    $user->save();
                    $count++;

                    Log::info('Categoría degradada por vigencia vencida', [
                        'user_id' => $user->id,
                        'from' => $previous,
                        'to' => $user->seller_category,
                        'categoria_expires_at' => $user->categoria_expires_at?->toIso8601String(),
                    ]);
                }
            });

        $expiredBronzeBenefits = User::query()
            ->whereRaw('LOWER(seller_category) = ?', ['bronce'])
            ->where('bronze_benefit_active', true)
            ->whereNotNull('benefit_expires_at')
            ->where('benefit_expires_at', '<', $now)
            ->update(['bronze_benefit_active' => false]);

        if ($count > 0) {
            $this->info("Usuarios degradados: {$count}");
        } else {
            $this->info('Ningún usuario con categoría vencida para degradar.');
        }
        if ($expiredBronzeBenefits > 0) {
            $this->info("Beneficios BRONCE expirados: {$expiredBronzeBenefits}");
        }

        return self::SUCCESS;
    }
}
