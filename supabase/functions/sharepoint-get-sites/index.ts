import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error('Company ID is required');
    }

    // Get Office 365 connection (prefer company-level via admin, fallback to user-level)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let connection: { 
      id: string;
      access_token: string;
      refresh_token: string | null;
      expires_at: string;
      company_id: string | null;
      user_id: string | null;
    } | null = null;

    if (company_id) {
      const { data: companyConn } = await supabaseAdmin
        .from('office365_connections')
        .select('id, access_token, refresh_token, expires_at, company_id, user_id')
        .eq('company_id', company_id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (companyConn?.access_token) connection = companyConn;
    }

    if (!connection) {
      const { data: userConn } = await supabaseAdmin
        .from('office365_connections')
        .select('id, access_token, refresh_token, expires_at, company_id, user_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (userConn?.access_token) connection = userConn;
    }

    if (!connection) {
      throw new Error('No Office 365 connection found. Please connect it in Settings > Integrations.');
    }

    // Prepare access token, refreshing if needed or missing
    let accessToken: string = connection.access_token || '';

    // If no token or expiring soon, try to refresh using refresh_token
    const expiresRaw = (connection as any).expires_at as string | null;
    const tokenExpiresAt = expiresRaw ? new Date(expiresRaw) : null;
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const needsRefresh = !accessToken || !tokenExpiresAt || tokenExpiresAt <= fiveMinutesFromNow;

    if (needsRefresh) {
      console.log('Access token missing/expired or expiring soon, refreshing...');
      
      if (!connection.refresh_token) {
        throw new Error('Office 365 connection expired and cannot be refreshed. Please reconnect in Settings > Integrations.');
      }

      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');

      // Refresh the token
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token refresh failed:', errorText);
        throw new Error('Failed to refresh Office 365 token. Please reconnect in Settings > Integrations.');
      }

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token as string;
      
      // Update the connection in the database
      const updateData: any = {
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Only update refresh_token if a new one was provided
      if (tokens.refresh_token) {
        updateData.refresh_token = tokens.refresh_token;
      }

      await supabaseAdmin
        .from('office365_connections')
        .update(updateData)
        .eq('id', connection.id);
      
      console.log('Token refreshed successfully');
    }

    // Get SharePoint sites using the (potentially refreshed) access token
    const sitesResponse = await fetch(
      'https://graph.microsoft.com/v1.0/sites?search=*',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!sitesResponse.ok) {
      throw new Error(`Failed to fetch sites: ${sitesResponse.status}`);
    }

    const sitesData = await sitesResponse.json();

    const sites = (sitesData.value || []).map((site: any) => ({
      id: site.id,
      name: site.name || site.displayName,
      webUrl: site.webUrl,
      description: site.description,
    }));

    return new Response(
      JSON.stringify({ sites }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching SharePoint sites:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
