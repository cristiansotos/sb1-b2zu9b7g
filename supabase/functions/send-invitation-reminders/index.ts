import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get invitations expiring in the next 24-48 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const { data: expiringInvitations, error: queryError } = await supabase
      .from('family_invitations')
      .select(`
        *,
        family_groups (
          id,
          name
        )
      `)
      .eq('status', 'pending')
      .gte('expires_at', tomorrow.toISOString())
      .lte('expires_at', dayAfterTomorrow.toISOString());

    if (queryError) {
      throw queryError;
    }

    if (!expiringInvitations || expiringInvitations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No invitations expiring soon",
          count: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${expiringInvitations.length} invitations expiring soon`);

    const appUrl = Deno.env.get("APP_URL") || "https://www.ethernalapp.com";
    const sentEmails: string[] = [];
    const failedEmails: string[] = [];

    for (const invitation of expiringInvitations) {
      try {
        // Get inviter info
        const { data: inviterProfile } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('id', invitation.invited_by)
          .maybeSingle();

        let inviterName = "Alguien";
        if (inviterProfile) {
          const parts = [inviterProfile.first_name, inviterProfile.last_name];
          inviterName = parts.filter(Boolean).join(' ') || inviterProfile.email || "Alguien";
        }

        const invitationLink = `${appUrl}/accept-invitation?token=${invitation.token}`;
        const familyName = (invitation.family_groups as any)?.name || "un grupo familiar";

        const expirationDate = new Date(invitation.expires_at);
        const hoursRemaining = Math.round((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60));

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  overflow: hidden;
                }
                .header {
                  background: #f59e0b;
                  padding: 40px 30px;
                  text-align: center;
                  color: white;
                }
                .content {
                  padding: 40px 30px;
                }
                .urgent-badge {
                  display: inline-block;
                  background: #dc2626;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-weight: 600;
                  margin-bottom: 20px;
                  font-size: 14px;
                }
                .main-message {
                  font-size: 18px;
                  line-height: 1.6;
                  margin-bottom: 25px;
                }
                .highlight {
                  color: #C57B57;
                  font-weight: 600;
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
                  text-align: center;
                  margin: 20px 0;
                }
                .footer {
                  padding: 30px;
                  text-align: center;
                  color: #6b7280;
                  font-size: 14px;
                  border-top: 1px solid #e5e7eb;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">⏰ Recordatorio de Invitación</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.95;">Ethernal</p>
                </div>
                <div class="content">
                  <div class="urgent-badge">¡Tu invitación expira pronto!</div>
                  <div class="main-message">
                    <p>Hola,</p>
                    <p><span class="highlight">${inviterName}</span> te invitó a unirte a <span class="highlight">"${familyName}"</span> en Ethernal.</p>
                    <p style="font-weight: 600; color: #dc2626;">Tu invitación expira en aproximadamente ${hoursRemaining} horas.</p>
                    <p>No pierdas la oportunidad de formar parte de este grupo familiar y comenzar a preservar historias juntos.</p>
                  </div>
                  <div style="text-align: center;">
                    <a href="${invitationLink}" class="button">Aceptar Invitación Ahora</a>
                  </div>
                  <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                    Si no aceptas la invitación antes de que expire, deberás solicitar una nueva.
                  </p>
                </div>
                <div class="footer">
                  <p style="margin: 0;">Ethernal - Preservando las historias de tu familia</p>
                  <p style="margin: 10px 0 0 0;">© 2024 Ethernal. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const emailText = `
Recordatorio: Tu invitación expira pronto

Hola,

${inviterName} te invitó a unirte a "${familyName}" en Ethernal.

Tu invitación expira en aproximadamente ${hoursRemaining} horas.

Para aceptar la invitación, visita:
${invitationLink}

Si no aceptas antes de que expire, necesitarás solicitar una nueva invitación.

---
Ethernal - Preservando las historias de tu familia
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Ethernal <contacto@ethernalapp.com>",
            to: [invitation.email],
            subject: `⏰ Recordatorio: Tu invitación expira pronto - ${familyName}`,
            html: emailHtml,
            text: emailText,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Failed to send reminder to ${invitation.email}:`, errorData);
          failedEmails.push(invitation.email);
        } else {
          console.log(`Reminder sent successfully to ${invitation.email}`);
          sentEmails.push(invitation.email);
        }
      } catch (emailError) {
        console.error(`Error processing invitation ${invitation.id}:`, emailError);
        failedEmails.push(invitation.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalInvitations: expiringInvitations.length,
        sent: sentEmails.length,
        failed: failedEmails.length,
        sentTo: sentEmails,
        failedTo: failedEmails
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error sending invitation reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});