import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

async function fetchGraphData(accessToken: string, endpoint: string) {
  let allResults: any[] = [];
  let url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0/${endpoint}`;

  while (url) {
    console.log('Fetching from:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Graph API error:', error);
      throw new Error(`Graph API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Add current batch to results
    if (data.value) {
      allResults = allResults.concat(data.value);
      console.log(`Fetched ${data.value.length} items, total so far: ${allResults.length}`);
    }

    // Check for next page
    url = data['@odata.nextLink'] || null;
  }

  return { value: allResults };
}

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
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body (handle empty body gracefully)
    let company_id = null;
    try {
      const body = await req.json();
      company_id = body?.company_id || null;
    } catch {
      // No body provided, continue without company_id
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user's company_id if not provided
    if (!company_id) {
      console.log('No company_id provided, fetching from user profile...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      company_id = profile?.company_id;
      console.log('User company_id:', company_id);
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Could not determine company_id for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get connection for this company (connections are company-level, not user-level)
    console.log('Sync request received. Company_id:', company_id, 'user_id:', user.id);
    const { data: connection, error: connError } = await supabase
      .from('office365_connections')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('Company connection found:', !!connection, 'error:', connError?.message);

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'No active Office 365 connection found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = connection.access_token;
    
    // Check if token needs refresh (expires within 5 minutes)
    const tokenExpiresAt = new Date(connection.expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    if (tokenExpiresAt <= fiveMinutesFromNow) {
      console.log('Access token expired or expiring soon, refreshing...');
      
      if (!connection.refresh_token) {
        throw new Error('Office 365 connection expired and cannot be refreshed. Please reconnect in Settings > Integrations.');
      }
      
      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
      
      const tokens = await refreshAccessToken(connection.refresh_token, clientId!, clientSecret!);
      accessToken = tokens.access_token;
      
      // Update tokens in database
      await supabase
        .from('office365_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || connection.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      
      console.log('Token refreshed successfully');
    }

    // Fetch users with phone numbers and groups
    const effectiveCompanyId = company_id ?? connection.company_id;
    const usersData = await fetchGraphData(accessToken, 'users?$select=userPrincipalName,displayName,mail,jobTitle,department,officeLocation,assignedLicenses,businessPhones,mobilePhone,memberOf&$expand=memberOf($select=id,displayName)');
    
    // Track sync statistics
    let totalUsers = 0;
    let usersWithLicenses = 0;
    let usersSkipped = 0;
    
    // Store users - only those with active licenses
    for (const graphUser of usersData.value || []) {
      totalUsers++;
      
      // Skip users without licenses
      if (!graphUser.assignedLicenses || graphUser.assignedLicenses.length === 0) {
        usersSkipped++;
        continue;
      }
      
      usersWithLicenses++;
      await supabase
        .from('synced_office365_users')
        .upsert({
          company_id: effectiveCompanyId,
          user_principal_name: graphUser.userPrincipalName,
          display_name: graphUser.displayName,
          mail: graphUser.mail,
          job_title: graphUser.jobTitle,
          department: graphUser.department,
          office_location: graphUser.officeLocation,
          assigned_licenses: graphUser.assignedLicenses,
          business_phones: graphUser.businessPhones || null,
          mobile_phone: graphUser.mobilePhone || null,
          member_of: graphUser.memberOf || null,
          is_active: true,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,user_principal_name',
        });
    }

    // Fetch mailboxes (shared mailboxes and groups)
    // Note: Microsoft Graph doesn't have a direct filter for shared mailboxes via mailboxSettings
    // We'll fetch groups with mail enabled as an alternative approach
    const mailboxesData = await fetchGraphData(
      accessToken,
      'groups?$filter=mailEnabled eq true&$select=displayName,mail,id'
    );

    // Store mailboxes with members
    for (const mailbox of mailboxesData.value || []) {
      // Fetch members for this group/mailbox
      let members = [];
      try {
        const membersData = await fetchGraphData(
          accessToken,
          `groups/${mailbox.id}/members?$select=id,displayName,mail,userPrincipalName`
        );
        members = membersData.value || [];
      } catch (error) {
        console.error(`Failed to fetch members for mailbox ${mailbox.displayName}:`, error);
      }

      await supabase
        .from('synced_office365_mailboxes')
        .upsert({
          company_id: effectiveCompanyId,
          mailbox_name: mailbox.displayName,
          email_address: mailbox.mail || mailbox.userPrincipalName,
          mailbox_type: 'shared',
          members: members,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id,email_address',
        });
    }

    // Auto-create auth users for synced O365 users (as inactive)
    // Create admin client for user management
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let usersCreated = 0;
    let usersExisted = 0;
    
    for (const syncedUser of usersData.value || []) {
      if (!syncedUser.mail) continue;
      
      // Check if user already exists
      const { data: existingUser } = await adminClient.auth.admin.listUsers();
      const userExists = existingUser?.users?.some((u: any) => u.email === syncedUser.mail);
      
      if (!userExists) {
        try {
          // Create auth user marked as O365 import
          await adminClient.auth.admin.createUser({
            email: syncedUser.mail,
            email_confirm: true,
            user_metadata: {
              full_name: syncedUser.displayName,
              imported_from_o365: true,
            },
          });
          usersCreated++;
        } catch (error) {
          console.error(`Failed to create user ${syncedUser.mail}:`, error);
        }
      } else {
        usersExisted++;
      }
    }

    // Update last sync time
    await supabase
      .from('office365_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', connection.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        total_users_found: totalUsers,
        users_synced: usersWithLicenses,
        users_skipped: usersSkipped,
        users_created: usersCreated,
        users_existed: usersExisted,
        mailboxes_synced: mailboxesData.value?.length || 0,
        sync_completed_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
