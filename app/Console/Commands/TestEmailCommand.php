<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email sending functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Testing email sending to: {$email}");
        
        try {
            $messageData = [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'phone' => '123456789',
                'subject' => 'test',
                'message' => 'This is a test message',
                'subject_type' => 'Test'
            ];

            Mail::send('emails.contact-form', $messageData, function($message) use ($email) {
                $message->to($email)
                        ->subject('Test Email - Cherry Central');
            });

            $this->info('Email sent successfully!');
            $this->info('Check your email or logs for the message.');
            
        } catch (\Exception $e) {
            $this->error('Error sending email: ' . $e->getMessage());
        }
    }
}
