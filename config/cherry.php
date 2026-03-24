<?php

return [

    'orders_web_base' => rtrim(env('CHERRY_ORDERS_WEB_URL', 'https://cherrydev.789.com.mx'), '/'),

    /** URL absoluta del logo para correos (S3 o CDN). Si vacío, se usa asset público. */
    'mail_logo_url' => env('CHERRY_MAIL_LOGO_URL'),

    'social_facebook' => env('CHERRY_SOCIAL_FACEBOOK_URL', 'https://www.facebook.com/'),

    'social_instagram' => env('CHERRY_SOCIAL_INSTAGRAM_URL', 'https://www.instagram.com/'),

    'returns_policy_url' => env('CHERRY_RETURNS_POLICY_URL', 'https://cherrydev.789.com.mx'),

];
