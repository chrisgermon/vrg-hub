type FeatureKey = 
  | 'hardware_requests'
  | 'toner_requests'
  | 'user_accounts'
  | 'marketing_requests'
  | 'department_requests'
  | 'monthly_newsletter'
  | 'modality_management'
  | 'print_ordering'
  | 'front_chat'
  | 'fax_campaigns';

export function useCompanyFeatures() {
  // Single-tenant default: enable all features
  const defaultFeatures: Record<FeatureKey, boolean> = {
    hardware_requests: true,
    toner_requests: true,
    user_accounts: true,
    marketing_requests: true,
    department_requests: true,
    monthly_newsletter: true,
    modality_management: true,
    print_ordering: true,
    front_chat: true,
    fax_campaigns: true,
  };

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    return defaultFeatures[featureKey] ?? true;
  };

  return {
    isFeatureEnabled,
    features: defaultFeatures,
    loading: false,
    refreshFeatures: async () => {},
  };
}
