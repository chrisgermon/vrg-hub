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

    // Admin client (service role) to read company-level config and tokens
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch active SharePoint configuration (single-tenant friendly)
    const { data: config } = await supabaseAdmin
      .from('sharepoint_configurations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!config) {
      return new Response(
        JSON.stringify({ documents: [], configured: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer company-level Office 365 token (admin-managed), fallback to user-level
    let connection: { access_token: string } | null = null;

    const { data: companyConnection } = await supabaseAdmin
      .from('office365_connections')
      .select('access_token')
      .is('user_id', null)
      .order('updated_at', { ascending: false })
      .maybeSingle();

    if (companyConnection?.access_token) {
      connection = companyConnection;
      console.log('Using company-level Office 365 token');
    } else {
      const { data: userConnection } = await supabaseAdmin
        .from('office365_connections')
        .select('access_token')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .maybeSingle();
      if (userConnection?.access_token) {
        connection = userConnection;
        console.log('Using user-level Office 365 token');
      }
    }

    if (!connection?.access_token) {
      throw new Error('Office 365 not connected');
    }

    // Construct the Microsoft Graph API URL
    let graphUrl: string;
    if (config.drive_id && config.folder_path) {
      // Get files from specific folder
      const folderPath = config.folder_path === '/' ? 'root' : `root:${config.folder_path}:`;
      graphUrl = `https://graph.microsoft.com/v1.0/drives/${config.drive_id}/${folderPath}/children`;
    } else if (config.site_id) {
      // Get default documents library
      graphUrl = `https://graph.microsoft.com/v1.0/sites/${config.site_id}/drive/root/children`;
    } else {
      throw new Error('SharePoint configuration incomplete');
    }

    console.log('Fetching documents from:', graphUrl);

    // Fetch documents from SharePoint
    const response = await fetch(graphUrl, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SharePoint API error:', errorText);
      throw new Error(`SharePoint API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter and format documents
    // Only include files that are not restricted (have link sharing enabled or are accessible to everyone)
    const documents = (data.value || [])
      .filter((item: any) => {
        // Only include files, not folders
        if (item.folder) return false;
        
        // Check if file has sharing links or is not restricted
        // If permissions property exists and shows restricted access, exclude it
        const hasRestrictedPermissions = item.permissions?.some((perm: any) => 
          perm.grantedToIdentitiesV2 && perm.grantedToIdentitiesV2.length > 0
        );
        
        return !hasRestrictedPermissions;
      })
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        size: item.size,
        createdDateTime: item.createdDateTime,
        lastModifiedDateTime: item.lastModifiedDateTime,
        createdBy: item.createdBy?.user?.displayName,
        lastModifiedBy: item.lastModifiedBy?.user?.displayName,
        fileType: item.name.split('.').pop()?.toUpperCase() || 'FILE',
        downloadUrl: item['@microsoft.graph.downloadUrl'],
      }));

    console.log(`Returning ${documents.length} documents`);

    return new Response(
      JSON.stringify({ documents, configured: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching SharePoint documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, documents: [], configured: false }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
