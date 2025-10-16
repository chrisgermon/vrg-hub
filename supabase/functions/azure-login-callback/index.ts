import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('Azure OAuth error:', error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=${encodeURIComponent(errorDescription || error)}`
        }
      });
    }

    if (!code) {
      throw new Error('No authorization code received');
    }

    const clientId = Deno.env.get('MICROSOFT_GRAPH_CLIENT_ID');
    const clientSecret = Deno.env.get('MICROSOFT_GRAPH_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/azure-login-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const { access_token } = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userInfo = await userResponse.json();
    const email = userInfo.mail || userInfo.userPrincipalName;
    const fullName = userInfo.displayName;

    if (!email) {
      throw new Error('No email found in Microsoft account');
    }

    console.log('User authenticated via Azure:', { email, fullName });

    // Extract domain from email
    const emailDomain = email.split('@')[1];
    
    // Initialize Supabase client with service role for domain validation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if domain is registered
    const { data: domainData, error: domainError } = await supabaseAdmin
      .from('company_domains')
      .select('domain, is_active')
      .eq('domain', emailDomain)
      .eq('is_active', true)
      .maybeSingle();

    if (domainError) {
      console.error('Error checking domain:', domainError);
      throw new Error('Failed to validate email domain');
    }

    if (!domainData) {
      console.warn('Unregistered domain attempted login:', emailDomain);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${url.origin}/?error=${encodeURIComponent('Your email domain is not registered. Please contact your administrator.')}`
        }
      });
    }

    // Check if user exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('Existing user found:', userId);
    } else {
      // Create new user with a random password (they'll use Azure login)
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          azure_login: true
        }
      });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        throw new Error('Failed to create user account');
      }

      userId = newUser.user.id;
      console.log('New user created:', userId);
    }

    // Prefer redirect origin encoded in OAuth state; fallback to referer; then default
    const stateParam = url.searchParams.get('state');
    let redirectDomain = 'https://hub.visionradiology.com.au';

    const safeHost = (host: string) => {
      return host.endsWith('.lovable.app') || host.endsWith('visionradiology.com.au');
    };

    if (stateParam) {
      try {
        const parsed = JSON.parse(atob(stateParam));
        if (parsed?.r) {
          const parsedUrl = new URL(parsed.r);
          if (safeHost(parsedUrl.host)) {
            redirectDomain = parsedUrl.origin;
          }
        }
      } catch (e) {
        console.warn('Failed to parse state for redirect origin:', e);
      }
    }

    if (redirectDomain === 'https://hub.visionradiology.com.au') {
      const referer = req.headers.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          if (safeHost(refUrl.host)) {
            redirectDomain = refUrl.origin;
          }
        } catch (_) {}
      }
    }

    console.log('Using redirect domain:', redirectDomain);
    
    // Generate a magic link token with redirect to custom domain
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${redirectDomain}/auth`
      }
    });

    if (magicLinkError || !magicLinkData) {
      console.error('Error generating magic link:', magicLinkError);
      throw new Error('Failed to generate login link');
    }

    // Redirect user to Supabase verification link directly so session is established
    const actionLink = magicLinkData.properties.action_link;
    if (!actionLink) {
      throw new Error('No action_link returned for magic link');
    }

    console.log('Redirecting to Supabase verify link:', actionLink);

    return new Response(null, {
      status: 302,
      headers: {
        'Location': actionLink
      }
    });

  } catch (error) {
    console.error('Azure callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/?error=${encodeURIComponent(errorMessage)}`
      }
    });
  }
});