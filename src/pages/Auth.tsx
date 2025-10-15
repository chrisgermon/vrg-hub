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
  const { signInWithPassword, signUp, user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const currentSubdomain = extractSubdomain(window.location.hostname);

  // Load company data based on subdomain
  useEffect(() => {
    const loadCompanyData = async () => {
      const subdomain = extractSubdomain(window.location.hostname);
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
      navigate('/home');
    }
  }, [user, userRole, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    // System admin should use /system-login instead
    if (email.toLowerCase() === 'crowdit@system.local') {
      setError('System administrators should use the system login page.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setError('Check your email for a confirmation link to complete registration.');
        setLoading(false);
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred during authentication');
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
              {isSignUp ? 'Create Account' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-sm">
              {isSignUp ? 'Create a new account to access your company portal' : 'Sign in to access your company portal'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6">
            {error && (
              <Alert variant={error.includes('Check your email') ? 'default' : 'destructive'}>
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button 
                type="submit"
                disabled={loading || !email || !password}
                className="w-full shadow-glow hover:scale-105 transition-all"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button 
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Button>
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