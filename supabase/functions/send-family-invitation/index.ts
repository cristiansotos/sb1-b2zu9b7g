import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationEmailData {
  invitationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { invitationId }: InvitationEmailData = body;

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Missing invitationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .select(`
        *,
        family_groups (
          id,
          name
        )
      `)
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invitation not found");
    }

    const { data: inviterProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, second_last_name, email')
      .eq('id', invitation.invited_by)
      .maybeSingle();

    let inviterName = "Alguien";
    if (inviterProfile) {
      const parts = [inviterProfile.first_name, inviterProfile.last_name];
      if (inviterProfile.second_last_name) {
        parts.push(inviterProfile.second_last_name);
      }
      inviterName = parts.filter(Boolean).join(' ') || inviterProfile.email || "Alguien";
    }

    const appUrl = Deno.env.get("APP_URL") || "https://www.ethernalapp.com";
    const invitationLink = `${appUrl}/accept-invitation?token=${invitation.token}`;
    const familyName = (invitation.family_groups as any)?.name || "un grupo familiar";

    const roleNames: Record<string, string> = {
      owner: 'Propietario',
      editor: 'Editor',
      viewer: 'Visualizador'
    };

    const roleDisplayName = roleNames[invitation.role] || invitation.role;

    const expirationDate = new Date(invitation.expires_at);
    const formattedExpiration = expirationDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
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
              background: #2563EB;
              padding: 40px 30px;
              text-align: center;
            }
            .logo-wrapper {
              margin-bottom: 15px;
            }
            .logo-img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .header-subtitle {
              color: rgba(255, 255, 255, 0.95);
              font-size: 18px;
              margin: 10px 0 0 0;
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
            .role-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              color: #92400e;
              border: 2px solid #fbbf24;
              margin: 0 4px;
            }
            .benefits {
              background: #F5EFE0;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .benefits-title {
              font-size: 16px;
              font-weight: 600;
              color: #424B54;
              margin: 0 0 15px 0;
            }
            .benefits ul {
              margin: 0;
              padding-left: 20px;
              color: #6b7280;
            }
            .benefits li {
              margin-bottom: 8px;
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
              transition: transform 0.2s;
            }
            .button:hover {
              transform: translateY(-2px);
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
              max-width: 180px;
              height: auto;
              margin: 0 auto 15px auto;
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
              <div class="logo-wrapper">
                <img src="https://www.ethernalapp.com/logo-blanco-horizontal.png" alt="Ethernal" class="logo-img" />
              </div>
              <p class="header-subtitle">Preservando las historias de tu familia</p>
            </div>

            <div class="content">
              <p class="greeting">¡Hola!</p>

              <p class="main-message">
                <span class="highlight">${inviterName}</span> te ha invitado a unirte al grupo familiar <span class="highlight">${familyName}</span> como <span class="role-badge">${roleDisplayName}</span>
              </p>

              <div class="benefits">
                <p class="benefits-title">🎉 Al unirte a este grupo familiar podrás:</p>
                <ul>
                  <li>Ver y contribuir a las historias y recuerdos familiares</li>
                  <li>Añadir grabaciones e imágenes al contenido compartido</li>
                  <li>Colaborar con otros miembros de la familia</li>
                  <li>Preservar el legado familiar para las futuras generaciones</li>
                </ul>
              </div>

              <div class="button-wrapper">
                <a href="${invitationLink}" class="button">Aceptar Invitación</a>
              </div>

              <div class="warning">
                <p class="warning-title">⏰ Esta invitación expira pronto</p>
                <p class="warning-text">
                  Asegúrate de aceptarla antes del <strong>${formattedExpiration}</strong>.
                </p>
              </div>

              <div class="security-note">
                🔒 <strong>Nota de seguridad:</strong> Si no esperabas esta invitación o no conoces a ${inviterName}, puedes ignorar este correo de forma segura.
              </div>
            </div>

            <div class="footer">
              <img src="https://www.ethernalapp.com/logo-blanco-horizontal.png" alt="Ethernal" class="footer-logo" />
              <p class="footer-text">Esta invitación fue enviada por ${inviterName}</p>
              <p class="footer-text">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p class="footer-link">${invitationLink}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
✨ Ethernal - Invitación al Grupo Familiar

¡Hola!

${inviterName} te ha invitado a unirte al grupo familiar "${familyName}" como ${roleDisplayName}.

🎉 Al unirte a este grupo familiar podrás:
- Ver y contribuir a las historias y recuerdos familiares
- Añadir grabaciones e imágenes al contenido compartido
- Colaborar con otros miembros de la familia
- Preservar el legado familiar para las futuras generaciones

Acepta tu invitación visitando:
${invitationLink}

⏰ Esta invitación expira el ${formattedExpiration}.

🔒 Nota de seguridad: Si no esperabas esta invitación o no conoces a ${inviterName}, puedes ignorar este correo de forma segura.

---
Ethernal - Preservando las historias de tu familia
    `;

    console.log(`Sending invitation email to ${invitation.email}`);
    console.log(`Family: ${familyName}`);
    console.log(`Role: ${roleDisplayName}`);
    console.log(`Link: ${invitationLink}`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not configured');
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ethernal <contacto@ethernalapp.com>',
        to: [invitation.email],
        subject: `${inviterName} te ha invitado a ${familyName}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      throw new Error(`Failed to send email via Resend: ${resendData.message || 'Unknown error'}`);
    }

    console.log('✅ Email sent successfully via Resend!');
    console.log('Email ID:', resendData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully via Resend",
        email: invitation.email,
        familyName,
        invitationLink,
        emailId: resendData.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending invitation email:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send invitation email",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});