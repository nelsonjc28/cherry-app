<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Nuevo Mensaje de Contacto</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
    <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #EA2630;">
            <h1 style="color: #EA2630; margin: 0; font-size: 24px;">Nuevo Mensaje de Contacto</h1>
            <p>Has recibido un nuevo mensaje a través del formulario de contacto de Cherry Central</p>
        </div>

        <div style="margin-bottom: 30px;">
            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Nombre:</strong>
                <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #EA2630; margin-top: 5px;">
                    {{ $name ?? 'No especificado' }}
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Email:</strong>
                <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #EA2630; margin-top: 5px;">
                    {{ $email ?? 'No especificado' }}
                </div>
            </div>

            @if(isset($phone) && !empty($phone))
            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Teléfono:</strong>
                <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #EA2630; margin-top: 5px;">
                    {{ $phone }}
                </div>
            </div>
            @endif

            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Asunto:</strong>
                <div style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #EA2630; margin-top: 5px;">
                    {{ $subject_type ?? 'No especificado' }}
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Mensaje:</strong>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #EA2630; margin-top: 5px; white-space: pre-wrap;">
                    {{ $message ?? 'No especificado' }}
                </div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
            <p><strong>Información del remitente:</strong></p>
            <p>Email: {{ $email ?? 'No especificado' }}</p>
            @if(isset($phone) && !empty($phone))
            <p>Teléfono: {{ $phone }}</p>
            @endif
        </div>

        <div style="color: #999; font-size: 12px; text-align: center; margin-top: 10px;">
            Mensaje enviado el {{ date('d/m/Y H:i:s') }}
        </div>
    </div>
</body>
</html> 