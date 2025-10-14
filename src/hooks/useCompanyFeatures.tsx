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
  // Stub implementation for single-tenant mode
  // All features are disabled
  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    return false;
  };

  return {
    isFeatureEnabled,
    features: {},
    loading: false,
    refreshFeatures: () => Promise.resolve(),
  };
}
