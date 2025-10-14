import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';

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

interface CompanyFeature {
  feature_key: string;
  enabled: boolean;
}

export function useCompanyFeatures() {
  const { selectedCompany } = useCompanyContext();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany?.id) {
      loadFeatures();

      // Set up real-time subscription for feature changes
      const channel = supabase
        .channel('company-features-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'company_features',
            filter: `company_id=eq.${selectedCompany.id}`,
          },
          () => {
            // Reload features when changes occur
            loadFeatures();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedCompany?.id]);

  const loadFeatures = async () => {
    if (!selectedCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('company_features')
        .select('feature_key, enabled')
        .eq('company_id', selectedCompany.id);

      if (error) throw error;

      const featuresMap: Record<string, boolean> = {};
      data?.forEach((feature: CompanyFeature) => {
        featuresMap[feature.feature_key] = feature.enabled;
      });

      setFeatures(featuresMap);
    } catch (error) {
      console.error('Error loading company features:', error);
      // Fail closed - disable all features on error for security
      setFeatures({});
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    // Fail closed while loading - don't show features until confirmed enabled
    if (loading) return false;
    
    // Check if feature exists in the map
    if (featureKey in features) {
      // Return the actual value if it exists
      return features[featureKey] === true;
    }
    
    // If feature doesn't exist in the map, default to enabled
    // This handles cases where features haven't been configured yet
    return true;
  };

  return {
    isFeatureEnabled,
    features,
    loading,
    refreshFeatures: loadFeatures,
  };
}