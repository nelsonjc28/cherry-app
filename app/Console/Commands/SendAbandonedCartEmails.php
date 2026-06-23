<?php

namespace App\Console\Commands;

use App\Services\AbandonedCartEmailService;
use Illuminate\Console\Command;

class SendAbandonedCartEmails extends Command
{
    protected $signature = 'mail:abandoned-cart';

    protected $description = 'Encola correos de carrito abandonado (3h, 1d, 3d, 1sem, 2sem, 1mes; máx. 6 por carrito).';

    public function __construct(
        protected AbandonedCartEmailService $abandonedCartEmailService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $stats = $this->abandonedCartEmailService->processAll('mail:abandoned-cart');

        $this->info(sprintf(
            'Abandoned cart: %d encolado(s), %d error(es), %d omitido(s).',
            $stats['encolados'],
            $stats['errores'],
            $stats['omitidos'],
        ));

        return $stats['errores'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
