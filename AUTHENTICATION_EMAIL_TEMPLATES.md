# Ethernal - Authentication Email Templates

This document contains Spanish email templates for Supabase Authentication. Copy and paste these templates into your Supabase Dashboard under **Authentication > Email Templates**.

**Configuration:**
- Sender Email: `contacto@ethernalapp.com`
- Sender Name: `Ethernal`

---

## 1. Signup Confirmation (Confirma tu Registro)

**Subject:** `Confirma tu registro en Ethernal`

**HTML Template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #424B54;
        background-color: #F5EFE0;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        padding: 40px 30px;
        text-align: center;
      }
      .logo-text {
        color: white;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: -0.5px;
        margin: 0 0 10px 0;
      }
      .header-subtitle {
        color: rgba(255, 255, 255, 0.95);
        font-size: 18px;
        margin: 0;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        color: #424B54;
        margin-bottom: 20px;
      }
      .main-message {
        font-size: 20px;
        color: #424B54;
        line-height: 1.6;
        margin-bottom: 30px;
        font-weight: 500;
      }
      .highlight {
        color: #C57B57;
        font-weight: 600;
      }
      .button-wrapper {
        text-align: center;
        margin: 35px 0;
      }
      .button {
        display: inline-block;
        padding: 16px 40px;
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(197, 123, 87, 0.3);
      }
      .info-box {
        background: #F5EFE0;
        border-radius: 8px;
        padding: 20px;
        margin: 30px 0;
      }
      .info-title {
        font-size: 16px;
        font-weight: 600;
        color: #424B54;
        margin: 0 0 15px 0;
      }
      .info-box ul {
        margin: 0;
        padding-left: 20px;
        color: #6b7280;
      }
      .info-box li {
        margin-bottom: 8px;
      }
      .security-note {
        font-size: 14px;
        color: #6b7280;
        margin: 20px 0;
        padding: 15px;
        background: #f9fafb;
        border-radius: 6px;
      }
      .footer {
        background: #424B54;
        padding: 30px;
        text-align: center;
        color: white;
      }
      .footer-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      .footer-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        margin: 8px 0;
      }
      .footer-link {
        word-break: break-all;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 15px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="logo-text">✨ Ethernal</h1>
        <p class="header-subtitle">Preservando las historias de tu familia</p>
      </div>

      <div class="content">
        <p class="greeting">¡Bienvenido/a!</p>

        <p class="main-message">
          Gracias por unirte a <span class="highlight">Ethernal</span>. Estás a un paso de comenzar a preservar las historias de tu familia.
        </p>

        <div class="button-wrapper">
          <a href="{{ .ConfirmationURL }}" class="button">Confirmar mi Cuenta</a>
        </div>

        <div class="info-box">
          <p class="info-title">🎉 Con Ethernal podrás:</p>
          <ul>
            <li>Grabar y preservar historias familiares de generación en generación</li>
            <li>Crear grupos familiares y colaborar con tus seres queridos</li>
            <li>Organizar recuerdos en capítulos temáticos</li>
            <li>Generar memorias personalizadas para compartir</li>
          </ul>
        </div>

        <div class="security-note">
          🔒 <strong>Nota de seguridad:</strong> Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">Ethernal</div>
        <p class="footer-text">Preservando las historias de tu familia</p>
        <p class="footer-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p class="footer-link">{{ .ConfirmationURL }}</p>
      </div>
    </div>
  </body>
</html>
```

---

## 2. Password Reset (Restablece tu Contraseña)

**Subject:** `Restablece tu contraseña de Ethernal`

**HTML Template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #424B54;
        background-color: #F5EFE0;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        padding: 40px 30px;
        text-align: center;
      }
      .logo-text {
        color: white;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: -0.5px;
        margin: 0 0 10px 0;
      }
      .header-subtitle {
        color: rgba(255, 255, 255, 0.95);
        font-size: 18px;
        margin: 0;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        color: #424B54;
        margin-bottom: 20px;
      }
      .main-message {
        font-size: 20px;
        color: #424B54;
        line-height: 1.6;
        margin-bottom: 30px;
        font-weight: 500;
      }
      .button-wrapper {
        text-align: center;
        margin: 35px 0;
      }
      .button {
        display: inline-block;
        padding: 16px 40px;
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(197, 123, 87, 0.3);
      }
      .warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        margin: 25px 0;
        border-radius: 4px;
      }
      .warning-title {
        font-weight: 600;
        color: #92400e;
        margin: 0 0 8px 0;
        font-size: 15px;
      }
      .warning-text {
        color: #78350f;
        margin: 0;
        font-size: 14px;
      }
      .security-note {
        font-size: 14px;
        color: #6b7280;
        margin: 20px 0;
        padding: 15px;
        background: #f9fafb;
        border-radius: 6px;
      }
      .footer {
        background: #424B54;
        padding: 30px;
        text-align: center;
        color: white;
      }
      .footer-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      .footer-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        margin: 8px 0;
      }
      .footer-link {
        word-break: break-all;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 15px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="logo-text">✨ Ethernal</h1>
        <p class="header-subtitle">Preservando las historias de tu familia</p>
      </div>

      <div class="content">
        <p class="greeting">¡Hola!</p>

        <p class="main-message">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta de Ethernal.
        </p>

        <div class="button-wrapper">
          <a href="{{ .ConfirmationURL }}" class="button">Restablecer Contraseña</a>
        </div>

        <div class="warning">
          <p class="warning-title">⏰ Este enlace expira pronto</p>
          <p class="warning-text">
            Por razones de seguridad, este enlace expirará en <strong>1 hora</strong>. Si necesitas más tiempo, solicita un nuevo enlace de restablecimiento.
          </p>
        </div>

        <div class="security-note">
          🔒 <strong>Nota de seguridad:</strong> Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura. Tu contraseña no cambiará a menos que hagas clic en el enlace y crees una nueva.
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">Ethernal</div>
        <p class="footer-text">Preservando las historias de tu familia</p>
        <p class="footer-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p class="footer-link">{{ .ConfirmationURL }}</p>
      </div>
    </div>
  </body>
</html>
```

---

## 3. Magic Link (Tu Enlace de Acceso)

**Subject:** `Tu enlace de acceso a Ethernal`

**HTML Template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #424B54;
        background-color: #F5EFE0;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        padding: 40px 30px;
        text-align: center;
      }
      .logo-text {
        color: white;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: -0.5px;
        margin: 0 0 10px 0;
      }
      .header-subtitle {
        color: rgba(255, 255, 255, 0.95);
        font-size: 18px;
        margin: 0;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        color: #424B54;
        margin-bottom: 20px;
      }
      .main-message {
        font-size: 20px;
        color: #424B54;
        line-height: 1.6;
        margin-bottom: 30px;
        font-weight: 500;
      }
      .button-wrapper {
        text-align: center;
        margin: 35px 0;
      }
      .button {
        display: inline-block;
        padding: 16px 40px;
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(197, 123, 87, 0.3);
      }
      .warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        margin: 25px 0;
        border-radius: 4px;
      }
      .warning-title {
        font-weight: 600;
        color: #92400e;
        margin: 0 0 8px 0;
        font-size: 15px;
      }
      .warning-text {
        color: #78350f;
        margin: 0;
        font-size: 14px;
      }
      .security-note {
        font-size: 14px;
        color: #6b7280;
        margin: 20px 0;
        padding: 15px;
        background: #f9fafb;
        border-radius: 6px;
      }
      .footer {
        background: #424B54;
        padding: 30px;
        text-align: center;
        color: white;
      }
      .footer-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      .footer-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        margin: 8px 0;
      }
      .footer-link {
        word-break: break-all;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 15px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="logo-text">✨ Ethernal</h1>
        <p class="header-subtitle">Preservando las historias de tu familia</p>
      </div>

      <div class="content">
        <p class="greeting">¡Hola!</p>

        <p class="main-message">
          Haz clic en el botón de abajo para acceder a tu cuenta de Ethernal.
        </p>

        <div class="button-wrapper">
          <a href="{{ .ConfirmationURL }}" class="button">Iniciar Sesión</a>
        </div>

        <div class="warning">
          <p class="warning-title">⏰ Este enlace expira pronto</p>
          <p class="warning-text">
            Por razones de seguridad, este enlace expirará en <strong>1 hora</strong>. Si necesitas acceder más tarde, solicita un nuevo enlace de acceso.
          </p>
        </div>

        <div class="security-note">
          🔒 <strong>Nota de seguridad:</strong> Si no solicitaste este enlace de acceso, puedes ignorar este correo de forma segura.
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">Ethernal</div>
        <p class="footer-text">Preservando las historias de tu familia</p>
        <p class="footer-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p class="footer-link">{{ .ConfirmationURL }}</p>
      </div>
    </div>
  </body>
</html>
```

---

## 4. Email Change Confirmation (Confirma tu Cambio de Email)

**Subject:** `Confirma tu nuevo correo electrónico en Ethernal`

**HTML Template:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #424B54;
        background-color: #F5EFE0;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        padding: 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        padding: 40px 30px;
        text-align: center;
      }
      .logo-text {
        color: white;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: -0.5px;
        margin: 0 0 10px 0;
      }
      .header-subtitle {
        color: rgba(255, 255, 255, 0.95);
        font-size: 18px;
        margin: 0;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        color: #424B54;
        margin-bottom: 20px;
      }
      .main-message {
        font-size: 20px;
        color: #424B54;
        line-height: 1.6;
        margin-bottom: 30px;
        font-weight: 500;
      }
      .highlight {
        color: #C57B57;
        font-weight: 600;
      }
      .button-wrapper {
        text-align: center;
        margin: 35px 0;
      }
      .button {
        display: inline-block;
        padding: 16px 40px;
        background: linear-gradient(135deg, #C57B57 0%, #f59e0b 100%);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 18px;
        box-shadow: 0 4px 12px rgba(197, 123, 87, 0.3);
      }
      .warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        margin: 25px 0;
        border-radius: 4px;
      }
      .warning-title {
        font-weight: 600;
        color: #92400e;
        margin: 0 0 8px 0;
        font-size: 15px;
      }
      .warning-text {
        color: #78350f;
        margin: 0;
        font-size: 14px;
      }
      .security-note {
        font-size: 14px;
        color: #6b7280;
        margin: 20px 0;
        padding: 15px;
        background: #f9fafb;
        border-radius: 6px;
      }
      .footer {
        background: #424B54;
        padding: 30px;
        text-align: center;
        color: white;
      }
      .footer-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      .footer-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        margin: 8px 0;
      }
      .footer-link {
        word-break: break-all;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 15px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 class="logo-text">✨ Ethernal</h1>
        <p class="header-subtitle">Preservando las historias de tu familia</p>
      </div>

      <div class="content">
        <p class="greeting">¡Hola!</p>

        <p class="main-message">
          Recibimos una solicitud para cambiar tu correo electrónico a <span class="highlight">{{ .Email }}</span>.
        </p>

        <div class="button-wrapper">
          <a href="{{ .ConfirmationURL }}" class="button">Confirmar Cambio</a>
        </div>

        <div class="warning">
          <p class="warning-title">⏰ Este enlace expira pronto</p>
          <p class="warning-text">
            Por razones de seguridad, este enlace expirará en <strong>1 hora</strong>. Si necesitas más tiempo, inicia el proceso de cambio nuevamente.
          </p>
        </div>

        <div class="security-note">
          🔒 <strong>Nota de seguridad:</strong> Si no solicitaste este cambio de correo electrónico, puedes ignorar este correo de forma segura. Tu correo actual no cambiará a menos que hagas clic en el enlace de confirmación.
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">Ethernal</div>
        <p class="footer-text">Preservando las historias de tu familia</p>
        <p class="footer-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p class="footer-link">{{ .ConfirmationURL }}</p>
      </div>
    </div>
  </body>
</html>
```

---

## How to Apply These Templates

1. Log into your Supabase Dashboard
2. Navigate to **Authentication > Email Templates**
3. Select each template type (Confirm signup, Magic Link, etc.)
4. Copy and paste the corresponding HTML from above
5. Update the subject line as specified
6. Save each template
7. Test by performing the relevant authentication action

## Multi-Language Support (Future)

<!-- TRANSLATION_NEEDED: All text content in these templates is currently in Spanish -->
<!-- Future Enhancement: Add language detection based on user metadata or browser locale -->
<!-- Key sections to translate:
  - Greetings and main messages
  - Button text
  - Warning and security notes
  - Footer text
-->

To prepare for multi-language support:
1. Store user's preferred language in `user_profiles.preferred_language`
2. Use Supabase Auth hooks to detect language and route to appropriate template
3. Create parallel English/Spanish versions of each template
4. Consider using a template engine that supports Go Templates conditionals

## Testing Checklist

- [ ] Verify sender shows as "Ethernal <contacto@ethernalapp.com>"
- [ ] Test on mobile devices (iOS Mail, Gmail app)
- [ ] Test on desktop email clients (Gmail, Outlook, Apple Mail)
- [ ] Verify all links work correctly
- [ ] Check that emails land in inbox (not spam)
- [ ] Confirm Spanish text is grammatically correct
- [ ] Test dark mode rendering
