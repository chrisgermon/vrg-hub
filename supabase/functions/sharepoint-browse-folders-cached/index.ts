import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 1; // Cache expires after 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let configAvailable = false;

  try {
    console.log('SharePoint browse-folders-cached request received');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing authorization header', 
          configured: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated', configured: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { folder_path, force_refresh } = await req.json();

    // Get user's O365 connection
    const { data: userO365 } = await supabaseAdmin
      .from('office365_connections')
      .select('company_id, access_token, expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const userConnection = userO365?.[0];

    if (!userConnection?.company_id) {
      const { data: anyConfigs } = await supabaseAdmin
        .from('sharepoint_configurations')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      return new Response(
        JSON.stringify({ 
          configured: anyConfigs && anyConfigs.length > 0, 
          needsO365: true,
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = userConnection.company_id;

    // Check SharePoint configuration
    const { data: configs } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('site_id, folder_path, company_id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = configs?.[0];

    if (!config) {
      return new Response(
        JSON.stringify({ 
          configured: false, 
          needsO365: false,
          folders: [], 
          files: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    configAvailable = true;

    const basePath = config.folder_path || '/';
    const browsePath = folder_path || basePath;

    // Try to get from cache first (unless force_refresh is true)
    if (!force_refresh) {
      const { data: cachedItems } = await supabaseAdmin
        .from('sharepoint_cache')
        .select('*')
        .eq('company_id', companyId)
        .eq('parent_path', browsePath)
        .gt('expires_at', new Date().toISOString());

      if (cachedItems && cachedItems.length > 0) {
        console.log(`Returning ${cachedItems.length} items from cache for path: ${browsePath}`);
        
        const folders = cachedItems
          .filter(item => item.item_type === 'folder')
          .map(item => ({
            id: item.item_id,
            name: item.name,
            webUrl: item.web_url,
            childCount: item.child_count || 0,
            lastModifiedDateTime: item.last_modified_datetime,
            permissions: item.permissions,
          }));

        const files = cachedItems
          .filter(item => item.item_type === 'file')
          .map(item => ({
            id: item.item_id,
            name: item.name,
            webUrl: item.web_url,
            size: item.size || 0,
            createdDateTime: item.created_datetime,
            lastModifiedDateTime: item.last_modified_datetime,
            createdBy: item.created_by,
            lastModifiedBy: item.last_modified_by,
            fileType: item.file_type,
            downloadUrl: item.download_url,
            permissions: item.permissions,
          }));

        return new Response(
          JSON.stringify({
            configured: true,
            currentPath: browsePath,
            folders,
            files,
            fromCache: true,
            cachedAt: cachedItems[0]?.cached_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Cache miss or force refresh - fetch from Microsoft Graph
    console.log('Cache miss or force refresh, fetching from Microsoft Graph API');

    if (!userConnection.access_token) {
      return new Response(
        JSON.stringify({ 
          error: 'Office 365 connection expired', 
          configured: true,
          needsO365: true,
          folders: [],
          files: []
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct Graph API URL (without permissions expansion as it's not supported on all SharePoint types)
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
        'Authorization': `Bearer ${userConnection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      
      // Check if token expired
      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired. Please reconnect your Office 365 account.', 
            configured: true,
            needsO365: true,
            folders: [],
            files: []
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Graph API error: ${graphResponse.status}`);
    }

    const graphData = await graphResponse.json();
    const items = graphData.value || [];

    // Process and cache items
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const cacheInserts = [];

    for (const item of items) {
      // Permissions are not available without $expand, store empty array
      const permissions: any[] = [];

      const cacheItem = {
        company_id: companyId,
        item_type: item.folder ? 'folder' : 'file',
        item_id: item.id,
        parent_path: browsePath,
        name: item.name,
        web_url: item.webUrl,
        size: item.size,
        child_count: item.folder?.childCount,
        created_datetime: item.createdDateTime,
        last_modified_datetime: item.lastModifiedDateTime,
        created_by: item.createdBy?.user?.displayName,
        last_modified_by: item.lastModifiedBy?.user?.displayName,
        file_type: item.file ? item.name.split('.').pop()?.toUpperCase() : null,
        download_url: item['@microsoft.graph.downloadUrl'],
        permissions: JSON.stringify(permissions),
        expires_at: expiresAt,
      };

      cacheInserts.push(cacheItem);
    }

    // Bulk insert into cache (upsert to handle duplicates)
    if (cacheInserts.length > 0) {
      await supabaseAdmin
        .from('sharepoint_cache')
        .upsert(cacheInserts, {
          onConflict: 'company_id,item_id,parent_path',
          ignoreDuplicates: false,
        });
      
      console.log(`Cached ${cacheInserts.length} items for path: ${browsePath}`);
    }

    // Separate and format response
    const folders = items
      .filter((item: any) => item.folder)
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        childCount: item.folder?.childCount || 0,
        lastModifiedDateTime: item.lastModifiedDateTime,
        permissions: [], // Permissions not available without separate API call
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
        permissions: [], // Permissions not available without separate API call
      }));

    return new Response(
      JSON.stringify({
        configured: true,
        currentPath: browsePath,
        folders,
        files,
        fromCache: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error browsing SharePoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, configured: configAvailable }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});