import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendLoginNotificationEmail(userEmail: string, userName: string, ipAddress: string, userAgent: string) {
  const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
  const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')
  
  if (!mailgunApiKey || !mailgunDomain) {
    console.error('Mailgun credentials not configured')
    return
  }

  const emailHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>New User Login Notification</h2>
        <p>A user has logged into the system.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">User Email:</td>
            <td style="padding: 8px;">${userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">User Name:</td>
            <td style="padding: 8px;">${userName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">IP Address:</td>
            <td style="padding: 8px;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">User Agent:</td>
            <td style="padding: 8px;">${userAgent}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Login Time:</td>
            <td style="padding: 8px;">${new Date().toISOString()}</td>
          </tr>
        </table>
      </body>
    </html>
  `

  const emailText = `
    New User Login Notification
    
    User Email: ${userEmail}
    User Name: ${userName || 'N/A'}
    IP Address: ${ipAddress}
    User Agent: ${userAgent}
    Login Time: ${new Date().toISOString()}
  `

  const formData = new FormData()
  formData.append('from', `System Notifications <notifications@${mailgunDomain}>`)
  formData.append('to', 'chris@crowdit.com.au')
  formData.append('subject', `User Login: ${userEmail}`)
  formData.append('html', emailHtml)
  formData.append('text', emailText)

  try {
    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to send login notification email:', errorText)
    } else {
      console.log('Login notification email sent successfully')
    }
  } catch (error) {
    console.error('Error sending login notification email:', error)
  }
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

    // Send login notification email to chris@crowdit.com.au
    await sendLoginNotificationEmail(
      profile?.email || user.email || 'unknown',
      profile?.full_name || 'Unknown User',
      ipAddress,
      userAgent
    )

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
