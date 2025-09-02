<?php

return [

    /*
    |--------------------------------------------------------------------------
    | File Upload Configuration
    |--------------------------------------------------------------------------
    |
    | Aquí puedes configurar los límites de archivos para diferentes tipos
    | de uploads en tu aplicación Laravel.
    |
    */

    'limits' => [
        // Límites generales de archivos
        'max_file_size' => env('MAX_FILE_SIZE', 10240), // 10MB en kilobytes
        
        // Límites específicos por tipo de archivo
        'images' => [
            'max_size' => env('MAX_IMAGE_SIZE', 10240), // 10MB
            'allowed_mimes' => ['jpeg', 'jpg', 'png', 'gif', 'webp'],
            'max_dimensions' => [
                'width' => env('MAX_IMAGE_WIDTH', 4096), // 4K
                'height' => env('MAX_IMAGE_HEIGHT', 4096)
            ]
        ],
        
        'pdfs' => [
            'max_size' => env('MAX_PDF_SIZE', 10240), // 10MB
            'allowed_mimes' => ['pdf']
        ],
        
        'documents' => [
            'max_size' => env('MAX_DOCUMENT_SIZE', 10240), // 10MB
            'allowed_mimes' => ['pdf', 'doc', 'docx', 'txt']
        ],
        
        'videos' => [
            'max_size' => env('MAX_VIDEO_SIZE', 51200), // 50MB
            'allowed_mimes' => ['mp4', 'avi', 'mov', 'wmv']
        ]
    ],

    /*
    |--------------------------------------------------------------------------
    | Upload Paths
    |--------------------------------------------------------------------------
    |
    | Rutas donde se almacenan los archivos subidos
    |
    */

    'paths' => [
        'images' => [
            'welcome_sections' => 'images/welcome-sections',
            'catalogs' => 'images/catalogs',
            'products' => 'images/products',
            'categories' => 'images/categories'
        ],
        
        'documents' => [
            'catalog_pdfs' => 'catalog-pdfs',
            'user_documents' => 'user-documents'
        ]
    ],

    /*
    |--------------------------------------------------------------------------
    | Validation Rules
    |--------------------------------------------------------------------------
    |
    | Reglas de validación predefinidas para diferentes tipos de archivos
    |
    */

    'validation_rules' => [
        'image' => 'image|mimes:jpeg,jpg,png,gif,webp|max:10240',
        'pdf' => 'file|mimes:pdf|max:10240',
        'document' => 'file|mimes:pdf,doc,docx,txt|max:10240',
        'video' => 'file|mimes:mp4,avi,mov,wmv|max:51200'
    ],

    /*
    |--------------------------------------------------------------------------
    | Error Messages
    |--------------------------------------------------------------------------
    |
    | Mensajes de error personalizados para validaciones de archivos
    |
    */

    'error_messages' => [
        'file_too_large' => 'El archivo excede el tamaño máximo permitido (:max_size)',
        'invalid_mime_type' => 'El tipo de archivo no está permitido',
        'invalid_dimensions' => 'Las dimensiones de la imagen no son válidas',
        'upload_failed' => 'Error al subir el archivo',
        'file_corrupted' => 'El archivo está corrupto o no es válido'
    ]

];


