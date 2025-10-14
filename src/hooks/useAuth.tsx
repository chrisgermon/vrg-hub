import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRole: string | null;
  company: any | null;
  loading: boolean;
  signInWithAzure: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile (without implicit joins) and then load company separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id,user_id,company_id,name,email,avatar_url,has_seen_theme_dialog')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData);

        // Load company explicitly
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id,name,slug,subdomain,logo_url,active,created_at,updated_at,use_custom_colors,primary_color,background_color,foreground_color,card_color,card_foreground_color,muted_color,muted_foreground_color,border_color,accent_color')
          .eq('id', profileData.company_id)
          .maybeSingle();

        if (companyError) {
          console.error('Error loading company:', companyError);
        }
        setCompany(companyData ?? null);

        // Fetch user role - check new structure first, then fall back to old
        // 1. Check platform_roles for super_admin
        const { data: platformRoleData } = await supabase
          .from('platform_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (platformRoleData?.role === 'platform_admin') {
          setUserRole('super_admin');
          return;
        }

        // 2. Check membership_roles for company role
        const { data: membershipData } = await supabase
          .from('company_memberships')
          .select(`
            id,
            membership_roles (
              role
            )
          `)
          .eq('user_id', userId)
          .eq('company_id', profileData.company_id)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipData?.membership_roles && membershipData.membership_roles.length > 0) {
          const membershipRole = (membershipData.membership_roles as any[])[0]?.role;
          
          // Map membership roles to UI roles
          if (membershipRole === 'company_owner' || membershipRole === 'company_admin') {
            setUserRole('tenant_admin');
          } else if (membershipRole === 'approver') {
            setUserRole('manager');
          } else if (membershipRole === 'requester') {
            setUserRole('requester');
          } else {
            setUserRole(membershipRole);
          }
          return;
        }

        // 3. Fall back to old user_roles table for backward compatibility
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('company_id', profileData.company_id)
          .maybeSingle();

        if (roleError) {
          console.error('Error loading role:', roleError);
        }
        if (roleData) {
          setUserRole(roleData.role);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Keep loading true until user data is fetched
          setLoading(true);
          
          // Defer user data fetching to avoid deadlock
          setTimeout(async () => {
            await fetchUserData(session.user.id);
            setLoading(false);
          }, 0);
          
          // Log login event with IP address
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            supabase.functions.invoke('log-login').catch(console.error);
          }

          // Store Office 365 tokens for SharePoint access when signing in with Azure
          if (event === 'SIGNED_IN' && session.user.app_metadata?.provider === 'azure') {
            setTimeout(async () => {
              try {
                const providerToken = session.provider_token;
                const providerRefreshToken = session.provider_refresh_token;
                
                if (providerToken) {
                  // Get user's company from profile
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                  if (profileData?.company_id) {
                    // Extract tenant ID from JWT token
                    let tenantId = null;
                    try {
                      const tokenParts = providerToken.split('.');
                      if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        tenantId = payload.tid;
                      }
                    } catch (e) {
                      console.error('Error extracting tenant ID:', e);
                    }

                    // Check for existing connection
                    const { data: existingConnection } = await supabase
                      .from('office365_connections')
                      .select('id')
                      .eq('company_id', profileData.company_id)
                      .eq('user_id', session.user.id)
                      .maybeSingle();

                    const connectionData = {
                      company_id: profileData.company_id,
                      user_id: session.user.id,
                      tenant_id: tenantId,
                      access_token: providerToken,
                      refresh_token: providerRefreshToken || '',
                      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                      is_active: true,
                      connected_by: session.user.id,
                    };

                    if (existingConnection) {
                      // Update existing connection
                      await supabase
                        .from('office365_connections')
                        .update(connectionData)
                        .eq('id', existingConnection.id);
                    } else {
                      // Insert new connection
                      await supabase
                        .from('office365_connections')
                        .insert([connectionData]);
                    }
                  }
                }
              } catch (error) {
                console.error('Error storing Office 365 tokens:', error);
              }
            }, 0);
          }

          // If this window was opened by the app (popup/new tab), notify opener then close
          try {
            if (window.opener) {
              window.opener.postMessage({
                type: 'auth:session',
                payload: {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }
              }, window.location.origin);
              setTimeout(() => window.close(), 100);
            }
          } catch (_) {
            // Ignore cross-origin access errors
          }
        } else {
          setProfile(null);
          setUserRole(null);
          setCompany(null);
          setLoading(false);
        }
      }
    );

    // Listen for session messages from popup/new tab and set session in this context
    const handleMessage = async (event: MessageEvent) => {
      // Validate message origin for security
      if (event.origin !== window.location.origin) {
        console.warn('Rejected message from untrusted origin:', event.origin);
        return;
      }
      
      const data = (event && (event as MessageEvent).data) as any;
      if (data?.type === 'auth:session' && data?.payload?.access_token && data?.payload?.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: data.payload.access_token,
            refresh_token: data.payload.refresh_token,
          });
          // Optionally refresh profile after session is set
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user?.id;
          if (uid) {
            setTimeout(() => fetchUserData(uid), 0);
          }
        } catch (err) {
          console.error('Error applying session from popup:', err);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setLoading(true);
        setTimeout(async () => {
          await fetchUserData(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Override role to tenant_admin when super admin is impersonating
  useEffect(() => {
    if (userRole === 'super_admin') {
      const impersonateId = sessionStorage.getItem('impersonate_company_id');
      if (impersonateId && impersonateId !== company?.id) {
        // Override to tenant_admin role when impersonating
        setUserRole('tenant_admin');
      }
    }
  }, [userRole, company]);

  const signInWithAzure = async () => {
    // Preserve subdomain in redirect URL
    const redirectUrl = `${window.location.origin}/auth`;

    // Request the provider URL without auto-redirect so we can control navigation
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email openid profile offline_access User.Read Files.Read.All Sites.Read.All',
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Azure AD login error:', error);
      
      // Log failed Azure login attempt
      try {
        await supabase.from('audit_logs').insert({
          action: 'failed_login',
          table_name: 'auth.users',
          user_email: 'azure_login_attempt',
          new_data: {
            provider: 'azure',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error('Failed to log login attempt:', logError);
      }
      
      throw error;
    }

    if (data?.url) {
      const url = data.url;
      const inIframe = window.self !== window.top;

      if (inIframe) {
        // In Lovable preview (iframe): open a new tab to avoid X-Frame-Options blocking
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (win) {
          win.opener = null;
          return;
        }
        // Fallback to top-level navigation if popup blocked
        try {
          if (window.top) {
            (window.top as Window).location.href = url;
            return;
          }
        } catch {}
      }

      // Outside iframe or final fallback: navigate current window
      window.location.href = url;
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // Log failed password login attempt
      try {
        await supabase.from('audit_logs').insert({
          action: 'failed_login',
          table_name: 'auth.users',
          user_email: email,
          new_data: {
            provider: 'password',
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error('Failed to log login attempt:', logError);
      }
      
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    company,
    loading,
    signInWithAzure,
    signInWithPassword,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};