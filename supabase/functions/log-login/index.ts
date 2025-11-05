import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Get user from session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    // Get IP address from request
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    // Get user agent
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    // Update last_login in profiles
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating last_login:', profileError)
    }

    // Log login to audit_logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        user_email: profile?.email || user.email,
        action: 'login',
        table_name: 'auth.users',
        record_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        new_data: {
          login_time: new Date().toISOString(),
          user_name: profile?.full_name
        }
      })

    if (auditError) {
      console.error('Error logging to audit_logs:', auditError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
