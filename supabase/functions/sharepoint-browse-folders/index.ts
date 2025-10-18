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
    console.log('SharePoint browse-folders request received');
    
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found in request');
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header. Please refresh the page and try again.', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Admin client (service role) to safely read company-level configuration/tokens
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('User authentication failed');
      return new Response(
        JSON.stringify({ 
          error: 'Not authenticated. Please log in again.', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.email);

    const { folder_path } = await req.json();

    // Fetch active SharePoint configuration (single-tenant friendly)
    const { data: config } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id, folder_path')
      .eq('is_active', true)
      .maybeSingle();

    if (!config) {
      return new Response(
        JSON.stringify({ 
          configured: false,
          folders: [],
          files: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer company-level Office 365 token (admin-managed), fallback to user-level
    let connection: { access_token: string } | null = null;

    const { data: companyConnection } = await supabaseAdmin
      .from('office365_connections')
      .select('access_token')
      .is('user_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (companyConnection?.access_token) {
      connection = companyConnection;
      console.log('Using company-level Office 365 token');
    } else {
      const { data: userConnection } = await supabaseAdmin
        .from('office365_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (userConnection?.access_token) {
        connection = userConnection;
        console.log('Using user-level Office 365 token');
      }
    }

    if (!connection?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Office 365 not connected', configured: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the path to browse
    const basePath = config.folder_path || '/';
    const browsePath = folder_path || basePath;

    // Construct the Graph API URL
    let graphUrl: string;
    if (browsePath === '/' || browsePath === '') {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root/children`;
    } else {
      const cleanPath = browsePath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root:/${cleanPath}:/children`;
    }

    console.log('Fetching from Graph API:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      throw new Error(`Graph API error: ${graphResponse.status}`);
    }

    const graphData = await graphResponse.json();
    const items = graphData.value || [];

    // Separate folders and files
    const folders = items
      .filter((item: any) => item.folder)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        childCount: item.folder?.childCount || 0,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }));

    const files = items
      .filter((item: any) => item.file)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        size: item.size || 0,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        createdBy: item.createdBy?.user?.displayName,
        lastModifiedBy: item.lastModifiedBy?.user?.displayName,
        fileType: item.name.split('.').pop()?.toUpperCase() || 'FILE',
        downloadUrl: item['@microsoft.graph.downloadUrl'],
      }));

    return new Response(
      JSON.stringify({
        configured: true,
        currentPath: browsePath,
        folders,
        files,
        siteName: config.site_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error browsing SharePoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
