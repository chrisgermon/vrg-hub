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

    const { folder_path } = await req.json();

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Get SharePoint configuration
    const { data: config } = await supabaseClient
      .from('sharepoint_configurations')
      .select('site_id, folder_path')
      .eq('company_id', profile.company_id)
      .eq('is_active', true)
      .single();

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

    // Try to get user's personal Office 365 token first, fall back to company token
    let connection;
    const { data: userConnection } = await supabaseClient
      .from('office365_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (userConnection?.access_token) {
      connection = userConnection;
      console.log('Using user-level Office 365 token');
    } else {
      // Fall back to company-level token
      const { data: companyConnection } = await supabaseClient
        .from('office365_connections')
        .select('access_token')
        .eq('company_id', profile.company_id)
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle();

      if (!companyConnection?.access_token) {
        throw new Error('Office 365 not connected. Please connect your account.');
      }
      connection = companyConnection;
      console.log('Using company-level Office 365 token');
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
