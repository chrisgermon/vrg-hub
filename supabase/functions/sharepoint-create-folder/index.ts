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
    const { folder_name, folder_path } = await req.json();

    if (!folder_name || folder_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Folder name is required' }),
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

    console.log(`Creating folder "${folder_name}" at path "${folder_path}" for user ${user.id}`);

    // Get company_id from Office 365 connection or profile
    const { data: connection } = await supabase
      .from('office365_connections')
      .select('company_id, access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    let companyId = connection?.company_id;
    if (!companyId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('brand_id')
        .eq('id', user.id)
        .maybeSingle();
      companyId = profile?.brand_id || user.id;
    }

    console.log(`Using company_id: ${companyId} for user ${user.id}`);
    console.log(`Connection data:`, connection ? 'found' : 'not found');

    // Get SharePoint configuration
    const { data: spConfig, error: configError } = await supabase
      .from('sharepoint_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    console.log(`SharePoint config lookup - Error: ${configError?.message || 'none'}, Found: ${!!spConfig}`);
    console.log(`Query params - company_id: ${companyId}, is_active: true`);

    if (configError || !spConfig) {
      console.error('SharePoint configuration not found or error occurred');
      return new Response(
        JSON.stringify({ 
          error: 'SharePoint not configured',
          configured: false,
          debug: {
            companyId,
            hasConnection: !!connection,
            configError: configError?.message
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we need O365 connection
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

    // Construct Microsoft Graph API URL to create folder
    const parentPath = folder_path || '/';
    let graphUrl: string;
    
    if (parentPath === '/' || parentPath === '') {
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root/children`;
    } else {
      const cleanPath = parentPath.replace(/^\/+/, '').replace(/\/+$/, '');
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${spConfig.site_id}/drive/root:/${cleanPath}:/children`;
    }

    console.log('Creating folder via Graph API:', graphUrl);

    const graphResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folder_name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail' // Fail if folder already exists
      }),
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error(`Graph API error ${graphResponse.status}:`, errorText);

      if (graphResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Office 365 token expired',
            needsO365: true
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 409) {
        return new Response(
          JSON.stringify({ 
            error: 'A folder with this name already exists'
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (graphResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Permission denied. You do not have permission to create folders here.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Failed to create folder: ${graphResponse.status}`,
          details: errorText
        }),
        { status: graphResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newFolder = await graphResponse.json();

    console.log(`Folder created successfully: ${newFolder.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        folder: {
          id: newFolder.id,
          name: newFolder.name,
          webUrl: newFolder.webUrl,
          createdDateTime: newFolder.createdDateTime,
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Create folder error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
