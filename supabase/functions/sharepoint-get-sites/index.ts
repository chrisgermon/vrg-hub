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

    let connection: { access_token: string } | null = null;

    if (company_id) {
      const { data: companyConn } = await supabaseAdmin
        .from('office365_connections')
        .select('access_token')
        .eq('company_id', company_id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (companyConn?.access_token) connection = companyConn;
    }

    if (!connection) {
      const { data: userConn } = await supabaseAdmin
        .from('office365_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (userConn?.access_token) connection = userConn;
    }

    if (!connection || !connection.access_token) {
      throw new Error('Office 365 not connected');
    }

    // Get SharePoint sites
    const sitesResponse = await fetch(
      'https://graph.microsoft.com/v1.0/sites?search=*',
      {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
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
