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
      : 'crowdhub.app';
    
    const subdomain = companyData?.subdomain;
    const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
    const redirectUrl = `${protocol}://${host}/settings?tab=integrations&success=true`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Get the default redirect URL from the state if available
    const url = new URL(req.url);
    const stateStr = url.searchParams.get('state');
    let redirectUrl = 'https://crowdhub.app/settings?tab=integrations';
    
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
          : 'crowdhub.app';
        
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
