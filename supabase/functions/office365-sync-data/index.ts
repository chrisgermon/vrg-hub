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

    // Determine company_id with multiple fallbacks
    if (!company_id) {
      // 1) Try from user profile (ignore errors if column doesn't exist)
      try {
        console.log('No company_id provided, attempting to infer from profile...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .maybeSingle();
        company_id = profile?.company_id || null;
      } catch (_) {
        // ignore
      }

      // 2) Fallback to user's most recent Office 365 connection
      if (!company_id) {
        console.log('Inferring company_id from user Office 365 connection...');
        const { data: userConnHint } = await supabase
          .from('office365_connections')
          .select('company_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        company_id = userConnHint?.company_id || null;
      }

      // 3) Final fallback: any active SharePoint configuration
      if (!company_id) {
        console.log('Inferring company_id from active SharePoint configuration...');
        const { data: activeConfig } = await supabase
          .from('sharepoint_configurations')
          .select('company_id')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        company_id = activeConfig?.company_id || null;
      }
    }

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Could not determine company_id for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a sync job record
    const { data: syncJob, error: jobError } = await supabase
      .from('office365_sync_jobs')
      .insert({
        company_id,
        started_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError || !syncJob) {
      console.error('Failed to create sync job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to create sync job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start the sync in the background and keep function alive until complete
    const syncPromise = performSync(syncJob.id, company_id, user.id, supabase).catch(err => {
      console.error('Background sync failed:', err);
    });
    
    // Keep the function instance alive until sync completes
    // @ts-ignore - EdgeRuntime is available in Deno Deploy
    if (typeof EdgeRuntime !== 'undefined') {
      // @ts-ignore
      EdgeRuntime.waitUntil(syncPromise);
    }

    // Return immediately with the job ID
    return new Response(
      JSON.stringify({ 
        success: true,
        job_id: syncJob.id,
        status: 'started',
        message: 'Sync started in background. Poll the job status for updates.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performSync(jobId: string, companyId: string, userId: string, supabase: any) {
  try {
    // Update job status to running
    await supabase
      .from('office365_sync_jobs')
      .update({ status: 'running' })
      .eq('id', jobId);

    console.log('Starting sync for job:', jobId, 'company:', companyId);

    // Debug visibility into connections available
    try {
      const { count: totalConns } = await supabase
        .from('office365_connections')
        .select('id', { count: 'exact', head: true });
      console.log('DEBUG office365_connections total:', totalConns, 'company_id:', companyId, 'user_id:', userId);
    } catch (e) {
      console.error('DEBUG failed counting office365_connections:', e);
    }

    // Try multiple strategies to find a connection
    console.log('Sync request received. Company_id:', companyId, 'user_id:', userId);

    let connection: any = null;
    let connError: any = null;

    // 1) If company_id provided, try tenant/company-level match
    if (companyId) {
      const { data: companyConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (companyConn) connection = companyConn; else connError = error || connError;
    }

    // 2) Fallback to user-level connection
    if (!connection) {
      const { data: userConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (userConn) connection = userConn; else connError = error || connError;
    }

    // 3) Final fallback: most recent tenant/company-level connection (user_id IS NULL)
    if (!connection) {
      const { data: tenantConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .is('user_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (tenantConn) connection = tenantConn; else connError = error || connError;
    }

    // 4) Last resort: any most recent connection regardless of user/company
    if (!connection) {
      const { data: anyConn, error } = await supabase
        .from('office365_connections')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (anyConn) connection = anyConn; else connError = error || connError;
    }

    console.log('Connection found:', !!connection, 'error:', connError?.message);

    if (!connection) {
      await supabase
        .from('office365_sync_jobs')
        .update({ 
          status: 'failed',
          error_message: 'No active Office 365 connection found',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      throw new Error('No active Office 365 connection found');
    }

    let accessToken = connection.access_token;

    // If access token is missing, attempt immediate refresh using refresh_token
    if (!accessToken) {
      if (!connection.refresh_token) {
        const errMsg = 'Office 365 not connected. Please connect or reconnect in Settings > Integrations.';
        await supabase
          .from('office365_sync_jobs')
          .update({ 
            status: 'failed',
            error_message: errMsg,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        throw new Error(errMsg);
      }
      const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
      const tokens = await refreshAccessToken(connection.refresh_token, clientId!, clientSecret!);
      accessToken = tokens.access_token;
      await supabase
        .from('office365_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || connection.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', connection.id);
      console.log('Token created via refresh due to missing access token');
    }
    
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
    const effectiveCompanyId = companyId ?? connection.company_id;
    let usersData;
    try {
      usersData = await fetchGraphData(
        accessToken,
        'users?$select=userPrincipalName,displayName,mail,jobTitle,department,officeLocation,assignedLicenses,businessPhones,mobilePhone,memberOf&$expand=memberOf($select=id,displayName)'
      );
    } catch (error) {
      console.error('Failed to fetch extended user data with group memberships. Falling back to basic user fields.', error);
      usersData = await fetchGraphData(
        accessToken,
        'users?$select=userPrincipalName,displayName,mail,jobTitle,department,officeLocation,assignedLicenses,businessPhones,mobilePhone'
      );
    }
    
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
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let usersCreated = 0;
    let usersExisted = 0;
    const existingEmails = new Set<string>();

    try {
      const perPage = 1000;
      let page = 1;
      while (true) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error('Failed to preload existing auth users for Office 365 sync:', error);
          break;
        }

        for (const existingUser of data?.users || []) {
          if (existingUser.email) {
            existingEmails.add(existingUser.email.toLowerCase());
          }
        }

        if (!data?.users || data.users.length < perPage) {
          break;
        }
        page++;
      }
    } catch (error) {
      console.error('Unexpected error preloading auth users for Office 365 sync:', error);
    }

    for (const syncedUser of usersData.value || []) {
      if (!syncedUser.mail) continue;

      const normalizedEmail = syncedUser.mail.toLowerCase();
      if (existingEmails.has(normalizedEmail)) {
        usersExisted++;
        continue;
      }

      try {
        await adminClient.auth.admin.createUser({
          email: syncedUser.mail,
          email_confirm: true,
          user_metadata: {
            full_name: syncedUser.displayName,
            imported_from_o365: true,
          },
        });
        usersCreated++;
        existingEmails.add(normalizedEmail);
      } catch (error) {
        console.error(`Failed to create user ${syncedUser.mail}:`, error);
      }
    }

    // Update last sync time
    await supabase
      .from('office365_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', connection.id);

    // Update job status to completed
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        status: 'completed',
        users_synced: usersWithLicenses,
        mailboxes_synced: mailboxesData.value?.length || 0,
        users_created: usersCreated,
        completed_at: new Date().toISOString(),
        progress: {
          total_users_found: totalUsers,
          users_synced: usersWithLicenses,
          users_skipped: usersSkipped,
          users_created: usersCreated,
          users_existed: usersExisted,
        }
      })
      .eq('id', jobId);

    console.log('Sync completed successfully for job:', jobId);
  } catch (error) {
    console.error('Sync error for job:', jobId, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update job status to failed
    await supabase
      .from('office365_sync_jobs')
      .update({ 
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}