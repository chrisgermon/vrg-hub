import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { extractSubdomain, getCompanyBySubdomain } from '@/lib/subdomain';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  isSuperAdminViewingOtherCompany: boolean;
  currentSubdomain: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { company, userRole } = useAuth();
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [currentSubdomain] = useState<string | null>(extractSubdomain());
  const isSuperAdmin = userRole === 'super_admin';

  // Initialize based on URL impersonation, subdomain, then fall back to user's company
  useEffect(() => {
    const initializeCompany = async () => {
      if (selectedCompany) return; // Already initialized
      
      // Check for impersonation parameter (super admin only)
      const urlParams = new URLSearchParams(window.location.search);
      const impersonateId = urlParams.get('impersonate');
      
      if (impersonateId && isSuperAdmin) {
        // Fetch the impersonated company
        // supabase client statically imported
        const { data: impersonatedCompany } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', impersonateId)
          .maybeSingle();
        
        if (impersonatedCompany) {
          setSelectedCompanyState(impersonatedCompany);
          // Store in sessionStorage for this tab only
          sessionStorage.setItem('impersonate_company_id', impersonateId);
          return;
        }
      }
      
      // Check sessionStorage for persisted impersonation (super admin only)
      const storedImpersonation = sessionStorage.getItem('impersonate_company_id');
      if (storedImpersonation && isSuperAdmin) {
        // supabase client statically imported
        const { data: impersonatedCompany } = await supabase
          .from('companies')
          .select('id, name, logo_url')
          .eq('id', storedImpersonation)
          .maybeSingle();
        
        if (impersonatedCompany) {
          setSelectedCompanyState(impersonatedCompany);
          return;
        }
      }
      
      // Try to load company from subdomain
      if (currentSubdomain) {
        const subdomainCompany = await getCompanyBySubdomain(currentSubdomain);
        if (subdomainCompany) {
          setSelectedCompanyState({
            id: subdomainCompany.id,
            name: subdomainCompany.name,
            logo_url: subdomainCompany.logo_url,
          });
          return;
        }
      }
      
      // Fall back to user's company
      if (company && !selectedCompany) {
        setSelectedCompanyState({
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
        });
      }
    };
    
    initializeCompany();
  }, [company, currentSubdomain, isSuperAdmin]);

  const setSelectedCompany = (newCompany: Company | null) => {
    setSelectedCompanyState(newCompany);
    // Store in localStorage for persistence
    if (newCompany) {
      localStorage.setItem('selected_company_id', newCompany.id);
    }
  };

  const isSuperAdminViewingOtherCompany = 
    isSuperAdmin && 
    selectedCompany?.id !== company?.id;

  return (
    <CompanyContext.Provider 
      value={{ 
        selectedCompany, 
        setSelectedCompany,
        isSuperAdminViewingOtherCompany,
        currentSubdomain,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
