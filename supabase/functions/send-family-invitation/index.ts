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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invitationId }: InvitationEmailData = await req.json();

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

    let inviterName = "Someone";
    if (inviterProfile) {
      const parts = [inviterProfile.first_name, inviterProfile.last_name];
      if (inviterProfile.second_last_name) {
        parts.push(inviterProfile.second_last_name);
      }
      inviterName = parts.filter(Boolean).join(' ') || inviterProfile.email || "Someone";
    }

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
    const invitationLink = `${appUrl}/accept-invitation?token=${invitation.token}`;
    const familyName = (invitation.family_groups as any)?.name || "a family group";

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
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .content {
              margin: 30px 0;
            }
            .role-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 600;
              background: #dbeafe;
              color: #1e40af;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background: #1d4ed8;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Family Group Invitation</h1>
            </div>

            <div class="content">
              <p>Hi there!</p>

              <p><strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> as a <span class="role-badge">${invitation.role}</span>.</p>

              <p>By joining this family group, you'll be able to:</p>
              <ul>
                <li>View and contribute to family stories and memories</li>
                <li>Add recordings and images to shared content</li>
                <li>Collaborate with other family members</li>
              </ul>

              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Accept Invitation</a>
              </div>

              <div class="warning">
                <strong>⏰ This invitation expires in 7 days</strong><br>
                Make sure to accept it before ${new Date(invitation.expires_at).toLocaleDateString()}.
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                If you weren't expecting this invitation or don't know ${inviterName}, you can safely ignore this email.
              </p>
            </div>

            <div class="footer">
              <p>This invitation was sent by ${inviterName}</p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px;">${invitationLink}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Family Group Invitation

${inviterName} has invited you to join ${familyName} as ${invitation.role}.

By joining this family group, you'll be able to:
- View and contribute to family stories and memories
- Add recordings and images to shared content
- Collaborate with other family members

Accept your invitation by visiting:
${invitationLink}

This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}.

If you weren't expecting this invitation or don't know ${inviterName}, you can safely ignore this email.
    `;

    console.log(`Sending invitation email to ${invitation.email}`);
    console.log(`Family: ${familyName}`);
    console.log(`Role: ${invitation.role}`);
    console.log(`Link: ${invitationLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email sent successfully",
        email: invitation.email,
        familyName,
        invitationLink
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
