import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { extractSubdomain, redirectToSubdomain } from '@/lib/subdomain';

/**
 * Guards routes to ensure users are on the correct subdomain
 * - Non-super-admins must be on their company's subdomain
 * - Super admins can access any subdomain
 * - Disabled in preview/development environments
 */
export function SubdomainGuard() {
  const { userRole, company, loading } = useAuth();
  const { currentSubdomain } = useCompanyContext();
  
  useEffect(() => {
    // Wait for auth to load
    if (loading || !company) return;
    
    // Disable subdomain enforcement in preview/development environments
    const hostname = window.location.hostname;
    const isPreview = hostname.includes('lovableproject.com') || 
                      hostname.includes('lovable.app') ||
                      hostname === 'localhost' || 
                      hostname === '127.0.0.1';
    
    if (isPreview) {
      console.log('SubdomainGuard: Skipping redirect in preview environment');
      return;
    }
    
    // Super admins can access any subdomain
    if (userRole === 'super_admin') return;
    
    // Check if user is on the wrong subdomain
    const userSubdomain = company.subdomain;
    
    if (currentSubdomain !== userSubdomain) {
      // Redirect to correct subdomain
      console.log(`Redirecting from subdomain "${currentSubdomain}" to "${userSubdomain}"`);
      redirectToSubdomain(userSubdomain);
    }
  }, [userRole, company, currentSubdomain, loading]);
  
  return null;
}
