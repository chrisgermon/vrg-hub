import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(
        `<html><body><script>window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return new Response(
        '<html><body><script>window.close();</script><p>Missing authorization code or state</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Decode state to get user ID
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/office365-oauth-user-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return new Response(
        '<html><body><script>window.close();</script><p>Token exchange failed</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const tokens = await tokenResponse.json();

    // Get tenant ID from access token
    const tokenParts = tokens.access_token.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    const tenantId = payload.tid;

    // Get user's company
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return new Response(
        '<html><body><script>window.close();</script><p>User profile not found</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if user connection already exists
    const { data: existing } = await supabaseAdmin
      .from('office365_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (existing) {
      // Update existing connection
      await supabaseAdmin
        .from('office365_connections')
        .update({
          tenant_id: tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new user connection
      await supabaseAdmin
        .from('office365_connections')
        .insert({
          company_id: profile.company_id,
          user_id: userId,
          tenant_id: tenantId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          connected_by: userId,
          is_active: true,
        });
    }

    return new Response(
      `<html>
        <body>
          <script>
            window.opener?.postMessage({ type: 'office365-connected' }, '*');
            window.close();
          </script>
          <p>Successfully connected Office 365! You can close this window.</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      `<html><body><script>window.close();</script><p>Error: ${errorMessage}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
});