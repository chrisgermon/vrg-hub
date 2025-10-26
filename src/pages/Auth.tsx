import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2 } from 'lucide-react';
import crowdHubLogo from '@/assets/crowdhub-logo.png';
import heroBackground from '@/assets/hero-background.svg';
import { useAuth } from '@/hooks/useAuth';
import { extractSubdomain, getCompanyBySubdomain } from '@/lib/subdomain';
import { supabase } from '@/integrations/supabase/client';
import { useTenantTheme } from '@/hooks/useTenantTheme';

export default function Auth() {
  const { signInWithAzure, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);

  const currentSubdomain = extractSubdomain(window.location.hostname);

  useTenantTheme(companyData);

  // Force custom domain for auth to ensure tokens land on correct origin
  // BUT only if there are no auth tokens in the URL
  useEffect(() => {
    const host = window.location.hostname;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('refresh_token');
    
    if (host.endsWith('.lovable.app') && !hasAuthTokens) {
      const target = 'https://hub.visionradiology.com.au' + window.location.pathname + window.location.search + window.location.hash;
      if (window.location.href !== target) {
        window.location.replace(target);
      }
    }
  }, []);

  // Handle magiclink tokens in URL (hash or query) and establish session explicitly
  useEffect(() => {
    // 0) Handle OAuth code exchange flow (some providers return ?code=...)
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      setLoading(true);
      supabase.auth
        .exchangeCodeForSession(window.location.href)
        .then(({ error }) => {
          if (error) {
            console.error('Error exchanging code for session:', error);
            setError('There was a problem completing sign-in. Please try again.');
          } else {
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            window.location.replace('/home');
          }
        })
        .finally(() => setLoading(false));
      return; // Stop further handling once code is processed
    }

    const tryHandleParams = (params: URLSearchParams) => {
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type');

      if (access_token && refresh_token) {
        setLoading(true);
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              console.error('Error setting session from magic link:', error);
              setError('There was a problem completing sign-in. Please try again.');
            } else {
              // Clean tokens from URL (remove both hash and query)
              window.history.replaceState(null, '', window.location.pathname);
              window.location.replace('/home');
            }
          })
          .finally(() => setLoading(false));
        return true;
      }
      return false;
    };

    // 1) Try hash params (#access_token=...)
    const hash = window.location.hash;
    if (hash) {
      const handled = tryHandleParams(new URLSearchParams(hash.substring(1)));
      if (handled) return;
    }

    // 2) Fallback: some flows may return tokens in the query string ?access_token=...
    const search = window.location.search;
    if (search) {
      tryHandleParams(new URLSearchParams(search.substring(1)));
    }
  }, [navigate]);

  // Load company data based on subdomain
  useEffect(() => {
    const loadCompanyData = async () => {
      const subdomain = extractSubdomain(window.location.hostname);
      if (subdomain) {
        const company = await getCompanyBySubdomain(subdomain);
        setCompanyData(company);
      }
      setLoadingCompany(false);
    };

    loadCompanyData();
  }, []);

  // Redirect authenticated users based on role
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/home');
    }
  }, [user, userRole, authLoading, navigate]);

  const handleAzureLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithAzure();
    } catch (err: any) {
      console.error('Azure login error:', err);
      setError(err.message || 'Failed to initiate Office 365 login');
      setLoading(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const logo = companyData?.logo_url || crowdHubLogo;
  const companyName = companyData?.name || 'CrowdHub';

  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 md:p-6 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-background/80 via-background/70 to-background/75" />
      
      {/* Content */}
      <div className="relative z-20 w-full max-w-md px-2">
        <div className="text-center mb-6 md:mb-10 space-y-4 md:space-y-6 animate-fade-in">
          <img src={logo} alt={companyName} className="h-16 md:h-20 mx-auto" />
        </div>

        <Card className="bg-card/80 backdrop-blur-md border-border/50 shadow-elevated">
          <CardHeader className="text-center px-4 md:px-6">
            <CardTitle className="flex items-center justify-center gap-2 text-xl md:text-2xl">
              <Building2 className="w-5 h-5 md:w-6 md:h-6" />
              Sign In with Office 365
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in with your organization's Office 365 account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/50 p-3 md:p-4 rounded-lg text-sm border border-border/30">
              <h4 className="font-medium mb-2 text-sm">Access Requirements:</h4>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• Your email domain must be registered with your organization</li>
                <li>• Only users from authorized domains can access the system</li>
                <li>• Your Office 365 account is required to access company documents</li>
                <li>• Contact your admin if you cannot access your organization</li>
              </ul>
            </div>

            <Button 
              onClick={handleAzureLogin}
              disabled={loading}
              className="w-full shadow-glow hover:scale-105 transition-all"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 23 23" fill="currentColor">
                    <path d="M0 0h11v11H0z" fill="#f25022"/>
                    <path d="M12 0h11v11H12z" fill="#00a4ef"/>
                    <path d="M0 12h11v11H0z" fill="#ffb900"/>
                    <path d="M12 12h11v11H12z" fill="#7fba00"/>
                  </svg>
                  Continue with Microsoft
                </>
              )}
            </Button>
            
            <div className="text-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              System administrators should use <a href="/system-login" className="text-primary hover:underline font-medium">system login</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}