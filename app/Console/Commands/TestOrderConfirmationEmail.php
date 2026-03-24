<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Mail\OrderConfirmationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestOrderConfirmationEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:order-confirmation-email {order_id?} {--email=} {--preview : Genera HTML en storage sin enviar correo}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Prueba el correo de confirmación: envío real o vista previa (--preview)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $orderId = $this->argument('order_id');
        $testEmail = $this->option('email');
        
        // Si se proporciona un ID de orden, usarlo
        if ($orderId) {
            $order = Order::with(['user', 'address', 'items.detalleRow'])->find($orderId);
            
            if (!$order) {
                $this->error("❌ No se encontró la orden con ID: {$orderId}");
                return 1;
            }
            
            $this->info("📦 Orden encontrada: #{$order->id}");
            $this->info("👤 Cliente: {$order->user->first_name} {$order->user->last_name}");
            $this->info("📧 Email del cliente: {$order->user->email}");
            $this->line("");

            $emailToSend = $testEmail ?: $order->user->email;
            if (! $this->option('preview') && $testEmail) {
                $this->warn("⚠️  Se enviará a: {$emailToSend} (email de prueba)");
            }

        } else {
            // Buscar la última orden pagada, si no hay, usar la última orden
            $order = Order::with(['user', 'address', 'items.detalleRow'])
                ->where('status', 'pagado')
                ->orderBy('id', 'desc')
                ->first();
            
            if (!$order) {
                // Si no hay orden pagada, usar la última orden disponible
                $order = Order::with(['user', 'address', 'items.detalleRow'])
                    ->orderBy('id', 'desc')
                    ->first();
                
                if (!$order) {
                    $this->error("❌ No se encontró ninguna orden en el sistema.");
                    $this->info("💡 Usa: php artisan test:order-confirmation-email {order_id}");
                    return 1;
                }
                
                $this->warn("⚠️  No hay órdenes pagadas. Usando la última orden disponible: #{$order->id}");
                $this->warn("   Estado actual: {$order->status}");
            } else {
                $this->info("📦 Usando la última orden pagada: #{$order->id}");
            }
            
            $this->info("👤 Cliente: {$order->user->first_name} {$order->user->last_name}");
            $this->info("📧 Email del cliente: {$order->user->email}");
            $this->line("");

            $emailToSend = $testEmail ?: $order->user->email;
            if (! $this->option('preview') && $testEmail) {
                $this->warn("⚠️  Se enviará a: {$emailToSend} (email de prueba)");
            }
        }
        
        // Mostrar información de la orden
        $this->info("📋 Detalles de la orden:");
        $this->line("   - ID: #{$order->id}");
        $this->line("   - Estado: {$order->status}");
        $this->line("   - Total: $" . number_format($order->total_amount, 2));
        $this->line("   - Items: " . $order->items->count());
        $this->line("   - Dirección: " . ($order->address ? "Envío a domicilio" : "Retiro en tienda"));
        $this->line("");

        if ($this->option('preview')) {
            $order->loadMissing(['user', 'address', 'items.detalleRow']);
            $html = (new OrderConfirmationMail($order))->render();
            $dir = storage_path('app/email-previews');
            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $path = $dir.DIRECTORY_SEPARATOR.'order-confirmation-'.$order->id.'.html';
            file_put_contents($path, $html);
            $this->info('✅ Vista previa generada (no se envió ningún correo).');
            $this->line('');
            $this->line('📄 Archivo: '.$path);
            $this->line('');
            $this->warn('Abre el HTML en el navegador (doble clic o arrastra al Chrome).');
            if (app()->environment('local')) {
                $url = url('/dev/mail-preview/order-confirmation/'.$order->id);
                $this->line('🌐 O en local con servidor activo: '.$url);
            }

            return 0;
        }

        // Confirmar antes de enviar
        if (! $this->confirm('¿Deseas enviar el correo de confirmación?', true)) {
            $this->info("❌ Envío cancelado.");
            return 0;
        }
        
        $this->line("");
        $this->info("📧 Enviando correo de confirmación...");
        
        try {
            // Crear una copia del email para enviar a la dirección de prueba si se especificó
            if ($testEmail && $testEmail !== $order->user->email) {
                // Enviar a la dirección de prueba pero mantener los datos de la orden original
                Mail::to($emailToSend)->send(new OrderConfirmationMail($order));
            } else {
                // Enviar normalmente
                Mail::to($emailToSend)->send(new OrderConfirmationMail($order));
            }
            
            $this->info("✅ Correo enviado exitosamente a: {$emailToSend}");
            $this->line("");
            $this->info("📬 Verifica tu bandeja de entrada (o spam) para ver el correo.");
            $this->info("💡 Si usas 'log' como driver de correo, revisa: storage/logs/laravel.log");
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error("❌ Error al enviar el correo:");
            $this->error("   " . $e->getMessage());
            $this->line("");
            $this->warn("💡 Verifica la configuración de correo en tu archivo .env");
            $this->warn("   MAIL_MAILER, MAIL_HOST, MAIL_PORT, etc.");
            
            Log::error('Error al enviar correo de prueba de confirmación', [
                'order_id' => $order->id,
                'email' => $emailToSend,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return 1;
        }
    }
}
