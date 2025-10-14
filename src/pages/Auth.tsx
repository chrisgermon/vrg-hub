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
import { extractSubdomain, getCompanyBySubdomain, buildSubdomainUrl } from '@/lib/subdomain';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { signInWithAzure, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  
  const currentSubdomain = extractSubdomain();

  // Load company data based on subdomain
  useEffect(() => {
    const loadCompanyData = async () => {
      const subdomain = extractSubdomain();
      if (subdomain) {
        const company = await getCompanyBySubdomain(subdomain);
        setCompanyData(company);
        
        // Apply custom colors if enabled
        if (company?.use_custom_colors) {
          const root = document.documentElement;
          const colorMap = {
            primary: company.primary_color,
            background: company.background_color,
            foreground: company.foreground_color,
            card: company.card_color,
            "card-foreground": company.card_foreground_color,
            muted: company.muted_color,
            "muted-foreground": company.muted_foreground_color,
            border: company.border_color,
            accent: company.accent_color,
          };

          Object.entries(colorMap).forEach(([key, value]) => {
            if (value) {
              root.style.setProperty(`--${key}`, value);
            }
          });
          
          // Store in localStorage for persistence
          localStorage.setItem('company_theme', JSON.stringify({
            companyId: company.id,
            colors: colorMap
          }));
        }
      }
      setLoadingCompany(false);
    };
    
    loadCompanyData();
  }, []);

  // Redirect authenticated users based on role
  useEffect(() => {
    if (user && !authLoading) {
      if (userRole === 'super_admin') {
        navigate('/admin/platform');
      } else {
        navigate('/home');
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const checkEmailAndRedirect = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailDomain = email.split('@')[1];
    if (!emailDomain) {
      setError('Please enter a valid email address');
      return;
    }

    setCheckingDomain(true);
    setError(null);

    try {
      // Check which company this domain belongs to (via Edge Function to bypass RLS)
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke('lookup-domain', {
        body: { domain: emailDomain }
      });

      console.log('[Auth] Domain lookup (EF) for:', emailDomain, 'Result:', { lookupData, lookupError });

      if (lookupError || !lookupData?.company) {
        console.error('[Auth] Domain lookup failed:', lookupError);
        setError('Your email domain is not registered. Please contact your administrator.');
        setCheckingDomain(false);
        return;
      }

      const company = (lookupData.company as any);
      const companySubdomain = company.subdomain;

      // If we're already on the correct subdomain, proceed with login
      if (currentSubdomain === companySubdomain) {
        await handleAzureLogin();
        return;
      }

      // If not on correct subdomain, redirect there first
      if (companySubdomain && currentSubdomain !== companySubdomain) {
        const redirectUrl = buildSubdomainUrl(companySubdomain, '/auth');
        window.location.href = redirectUrl;
        return;
      }

      // Fallback - just proceed with login
      await handleAzureLogin();
    } catch (err: any) {
      console.error('Error checking domain:', err);
      setError('Failed to verify email domain. Please try again.');
      setCheckingDomain(false);
    }
  };

  const handleAzureLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting Azure AD login...');
      console.log('Current origin:', window.location.origin);
      
      await signInWithAzure();
    } catch (err: any) {
      console.error('Azure AD login error:', err);
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // If on root domain, show email input first
    if (!currentSubdomain) {
      setShowEmailInput(true);
    } else {
      // If already on a subdomain, just login
      handleAzureLogin();
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
              Sign In
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in with your organisation's Azure AD account to access your company portal
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
                <li>• Your email domain must be registered with your organisation</li>
                <li>• Only users from authorised domains can access the system</li>
                <li>• Contact your admin if you cannot access your organisation</li>
              </ul>
            </div>

            {showEmailInput && !currentSubdomain ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && checkEmailAndRedirect()}
                    disabled={checkingDomain}
                  />
                </div>
                <Button 
                  onClick={checkEmailAndRedirect}
                  disabled={checkingDomain || !email}
                  className="w-full shadow-glow hover:scale-105 transition-all"
                  size="lg"
                >
                  {checkingDomain ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking domain...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowEmailInput(false);
                    setEmail('');
                    setError(null);
                  }}
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleContinue}
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
            )}

            <div className="text-center text-xs text-muted-foreground mt-4">
              By signing in, you agree to your organisation's terms of service
            </div>
            
            <div className="text-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
              System administrators should use <a href="/system-login" className="text-primary hover:underline font-medium">system login</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}