<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'mercadopago' => [
        'access_token' => env('MP_TOKEN'),
        'public_key' => env('MP_KEY'),
        'environment' => env('MERCADOPAGO_ENVIRONMENT', 'sandbox'), // sandbox or production
        'currency_id' => env('MERCADOPAGO_CURRENCY_ID', 'MXN'), // ARS, MXN, BRL, etc.
    ],

    /*
    | Respond.io Website Chat — script URL from dashboard overrides channel-based URL.
    | WordPress/cache docs reference: https://cdn.respond.io/webchat/widget/{id}.js
    */
    'respond_io' => [
        'enabled' => filter_var(env('RESPOND_IO_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
        'channel_id' => trim((string) env('RESPOND_IO_CHANNEL_ID', 'YOUR_RESPOND_IO_CHANNEL_ID')),
        'widget_script_url' => ($u = trim((string) env('RESPOND_IO_WIDGET_SCRIPT_URL', ''))) !== '' ? $u : null,
    ],

];
