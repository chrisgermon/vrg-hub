import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateStr = url.searchParams.get('state');
    
    if (!code || !stateStr) {
      throw new Error('Missing code or state parameter');
    }

    const state = JSON.parse(stateStr);
    const { company_id, user_id } = state;

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/office365-oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Get tenant ID from the access token (it's in the JWT)
    const tokenParts = tokens.access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    const tenantId = payload.tid;

    // Store connection in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: insertError } = await supabase
      .from('office365_connections')
      .upsert({
        company_id,
        user_id: null, // Company-level connection, not user-specific
        tenant_id: tenantId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_by: user_id,
        is_active: true,
      }, {
        onConflict: 'company_id',
      });

    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error('Failed to store connection');
    }

    // Get the company's subdomain for redirect
    const { data: companyData } = await supabase
      .from('companies')
      .select('subdomain')
      .eq('id', company_id)
      .single();
    
    // Build redirect URL with subdomain
    const protocol = Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http' : 'https';
    const baseDomain = Deno.env.get('SUPABASE_URL')?.includes('localhost') 
      ? 'localhost:8080' 
      : 'hub.visionradiology.com.au';
    
    const subdomain = companyData?.subdomain;
    const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
    const redirectUrl = `${protocol}://${host}/settings?tab=integrations&success=true`;

    // Return HTML page instead of redirect to show success message
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Office 365 Connected</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              text-align: center;
              max-width: 400px;
            }
            h1 {
              color: #1a202c;
              margin: 0 0 1rem 0;
              font-size: 1.5rem;
            }
            p {
              color: #4a5568;
              margin: 0 0 1.5rem 0;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1rem auto;
            }
            .checkmark {
              width: 32px;
              height: 32px;
              border: 3px solid white;
              border-top: none;
              border-right: none;
              transform: rotate(-45deg);
              margin-top: -8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <div class="checkmark"></div>
            </div>
            <h1>Successfully Connected!</h1>
            <p>Your Office 365 account has been connected. This window will close automatically.</p>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '${redirectUrl}';
            }, 2000);
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Get the default redirect URL from the state if available
    const url = new URL(req.url);
    const stateStr = url.searchParams.get('state');
    let redirectUrl = 'https://hub.visionradiology.com.au/settings?tab=integrations';
    
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr);
        const { company_id } = state;
        
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: companyData } = await supabase
          .from('companies')
          .select('subdomain')
          .eq('id', company_id)
          .single();
        
        const protocol = Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http' : 'https';
        const baseDomain = Deno.env.get('SUPABASE_URL')?.includes('localhost') 
          ? 'localhost:8080' 
          : 'hub.visionradiology.com.au';
        
        const subdomain = companyData?.subdomain;
        const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
        redirectUrl = `${protocol}://${host}/settings?tab=integrations`;
      } catch (e) {
        // Fall back to default URL
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${redirectUrl}&error=${encodeURIComponent(errorMessage)}`,
      },
    });
  }
});
