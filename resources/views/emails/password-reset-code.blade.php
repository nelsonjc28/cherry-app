<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Recuperación de Contraseña</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background-color: #EA2630;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333333;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #666666;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .code-container {
            background-color: #f8f8f8;
            border: 2px dashed #EA2630;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code-label {
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            color: #EA2630;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .expiry-info {
            font-size: 13px;
            color: #999999;
            margin-top: 15px;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #856404;
        }
        .footer {
            background-color: #f8f8f8;
            padding: 20px 30px;
            text-align: center;
            font-size: 13px;
            color: #999999;
        }
        .footer p {
            margin: 5px 0;
        }
        .footer a {
            color: #EA2630;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>CHERRY</h1>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                ¡Hola {{ $name }}!
            </div>

            <div class="message">
                Has recibido este correo porque solicitaste restablecer tu contraseña en Cherry Central.
            </div>

            <div class="message">
                Para continuar con el proceso de recuperación, utiliza el siguiente código de verificación:
            </div>

            <!-- Code Display -->
            <div class="code-container">
                <div class="code-label">Tu Código de Verificación</div>
                <div class="code">{{ $code }}</div>
                <div class="expiry-info">Este código expira en 15 minutos</div>
            </div>

            <div class="message">
                Ingresa este código en la página de recuperación de contraseña para continuar.
            </div>

            <!-- Warning -->
            <div class="warning">
                <strong>⚠️ Importante:</strong> Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje. Tu cuenta permanecerá segura.
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Cherry Central</strong></p>
            <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            <p>Si tienes alguna pregunta, contáctanos en <a href="mailto:support@cherrycentral.com">support@cherrycentral.com</a></p>
        </div>
    </div>
</body>
</html>


