import { supabase } from "@/integrations/supabase/client";

export interface SubdomainInfo {
  subdomain: string | null;
  isRootDomain: boolean;
  companyId: string | null;
}

/**
 * Extracts subdomain from the current hostname
 * Examples:
 * - vrg.crowdhub.app -> "vrg"
 * - crowdhub.app -> null (root domain)
 * - vrg.localhost:8080 -> "vrg"
 * - localhost:8080 -> null
 */
export function extractSubdomain(hostname: string = window.location.hostname): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Handle localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  
  // Handle localhost with subdomain (e.g., vrg.localhost)
  if (host.endsWith('.localhost')) {
    const parts = host.split('.');
    return parts.length > 1 ? parts[0] : null;
  }
  
  // Handle production domains (e.g., vrg.crowdhub.app)
  const parts = host.split('.');
  
  // Root domain (crowdhub.app) or IP address
  if (parts.length <= 2) {
    return null;
  }
  
  // Subdomain exists (vrg.crowdhub.app)
  return parts[0];
}

/**
 * Fetches company information based on subdomain
 */
export async function getCompanyBySubdomain(subdomain: string | null): Promise<any | null> {
  if (!subdomain) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,slug,subdomain,logo_url,background_image_url,active,use_custom_colors,primary_color,background_color,foreground_color,card_color,card_foreground_color,muted_color,muted_foreground_color,border_color,accent_color')
    .eq('subdomain', subdomain)
    .eq('active', true)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching company by subdomain:', error);
    return null;
  }
  
  return data;
}

/**
 * Gets the current subdomain information
 */
export function getSubdomainInfo(): SubdomainInfo {
  const subdomain = extractSubdomain();
  return {
    subdomain,
    isRootDomain: subdomain === null,
    companyId: null, // Will be populated by async lookup
  };
}

/**
 * Builds a URL for a specific subdomain
 */
export function buildSubdomainUrl(subdomain: string | null, path: string = '/'): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Handle localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const host = subdomain ? `${subdomain}.localhost` : 'localhost';
    return `${protocol}//${host}${port ? `:${port}` : ''}${path}`;
  }
  
  // Handle production
  const baseDomain = hostname.split('.').slice(-2).join('.'); // Gets 'crowdhub.app' from 'vrg.crowdhub.app'
  const host = subdomain ? `${subdomain}.${baseDomain}` : baseDomain;
  
  return `${protocol}//${host}${path}`;
}

/**
 * Redirects to a specific company's subdomain
 */
export function redirectToSubdomain(subdomain: string | null, path: string = '/') {
  const url = buildSubdomainUrl(subdomain, path);
  window.location.href = url;
}
