<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

echo "=== CHECKING ADMIN USER ===\n";

$user = User::with('role')->where('email', 'admin@cherrycentral.com')->first();

if ($user) {
    echo "✅ Admin user found:\n";
    echo "- ID: " . $user->id . "\n";
    echo "- Email: " . $user->email . "\n";
    echo "- Name: " . $user->first_name . " " . $user->last_name . "\n";
    echo "- Role: " . ($user->role ? $user->role->name : 'no role') . "\n";
    echo "- Is Admin: " . (($user->role && $user->role->name === 'admin') ? 'Yes' : 'No') . "\n";
} else {
    echo "❌ Admin user not found\n";
}

echo "\n=== TEST COMPLETE ===\n"; 