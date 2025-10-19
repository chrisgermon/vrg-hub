import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'requester' | 'manager' | 'marketing_manager' | 'tenant_admin' | 'super_admin' | 'marketing';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  profile: any | null;
  company: any | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [company, setCompany] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRole('requester');
        return;
      }

      const roles = (data?.map(r => r.role) || []) as UserRole[];
      // Determine highest role via explicit priority
      const priority: Record<UserRole, number> = {
        super_admin: 100,
        tenant_admin: 90,
        marketing_manager: 60,
        manager: 50,
        marketing: 40,
        requester: 10,
      };

      const highest = roles.sort((a, b) => (priority[b] ?? 0) - (priority[a] ?? 0))[0] || 'requester';
      setUserRole(highest);
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setUserRole('requester');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
      // Fetch user role and profile when session changes
      if (session?.user) {
        setTimeout(() => {
          fetchUserRole(session.user.id);
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setUserRole(null);
        setProfile(null);
      }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Activate user profile if this is their first sign-in
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, imported_from_o365')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && !profile.is_active && profile.imported_from_o365) {
        await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', data.user.id);
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) throw error;
  };

  const signInWithAzure = async () => {
    try {
      // Call edge function to get Azure auth URL
      const { data, error } = await supabase.functions.invoke('azure-login-initiate');
      
      if (error) throw error;
      
      if (data?.authUrl) {
        // Redirect to Microsoft login
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error: any) {
      console.error('Azure login error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setCompany(null);
    setUserRole(null);
    setSession(null);
    setUser(null);
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const refetchProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
    value={{
      user,
      session,
      userRole,
      loading,
      profile,
      company,
      signInWithPassword,
      signUp,
      signInWithAzure,
      signOut,
      refetchProfile,
    }}
      >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}