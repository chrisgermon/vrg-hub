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
    // Parse body safely
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const search_query = (payload?.search_query ?? '').toString();

    if (!search_query || search_query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine company context
    const { data: connection } = await supabase
      .from('office365_connections')
      .select('company_id, access_token, refresh_token, token_expires_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    let companyId = connection?.company_id as string | undefined;
    if (!companyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle();
      companyId = (profile?.brand_id as string | undefined) || user.id;
    }

    // Get SharePoint configuration
    const { data: spConfig, error: configError } = await supabase
      .from('sharepoint_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !spConfig) {
      return new Response(
        JSON.stringify({ 
          error: 'SharePoint not configured',
          configured: false,
          needsO365: false
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Require O365 connection
    if (!connection?.access_token) {
      return new Response(
        JSON.stringify({ 
          error: 'Office 365 connection required',
          configured: true,
          needsO365: true
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Microsoft Graph search API
    const searchUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root/search(q='${encodeURIComponent(search_query)}')`;
    console.log(`SharePoint search for user ${user.id}, company ${companyId}: "${search_query}"`);

    const graphResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const bodyText = await graphResponse.text().catch(() => '');
      console.error(`Graph search error ${graphResponse.status}: ${bodyText}`);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired',
            configured: true,
            needsO365: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient permissions for Microsoft Graph search',
            details: bodyText,
            configured: true,
            needsO365: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Graph API error: ${graphResponse.status}`,
          details: bodyText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await graphResponse.json();

    // Process results
    const folders: Array<Record<string, any>> = [];
    const files: Array<Record<string, any>> = [];

    for (const item of data.value || []) {
      if (item.folder) {
        folders.push({
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          path: item.parentReference?.path?.replace('/drive/root:', '') || '/',
          childCount: item.folder.childCount || 0,
          lastModifiedDateTime: item.lastModifiedDateTime,
        });
      } else if (item.file) {
        files.push({
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          path: item.parentReference?.path?.replace('/drive/root:', '') || '/',
          size: item.size,
          createdDateTime: item.createdDateTime,
          lastModifiedDateTime: item.lastModifiedDateTime,
          createdBy: item.createdBy?.user?.displayName,
          lastModifiedBy: item.lastModifiedBy?.user?.displayName,
          fileType: (item.name || '').split('.').pop()?.toUpperCase() || 'FILE',
          downloadUrl: item['@microsoft.graph.downloadUrl'],
        });
      }
    }

    return new Response(
      JSON.stringify({
        folders,
        files,
        totalResults: folders.length + files.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});