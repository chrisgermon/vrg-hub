import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  | 'fax_campaigns'
  | 'knowledge_base'
  | 'approvals';

interface UseCompanyFeaturesOptions {
  enabled?: boolean;
  companyId?: string | null;
}

export function useCompanyFeatures(options: UseCompanyFeaturesOptions = {}) {
  const { enabled = true, companyId = null } = options;
  const { toast } = useToast();

  const {
    data: featureFlags,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['feature-flags', companyId ?? 'global'],
    queryFn: async () => {
      let query = supabase.from('feature_flags').select('*');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled,
    onError: (error: any) => {
      console.error('Error loading feature flags:', error);
      toast({
        title: 'Unable to load feature flags',
        description: error.message ?? 'We could not fetch the latest feature configuration.',
        variant: 'destructive',
      });
    },
  });

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    if (!featureFlags) return true; // Default to enabled while loading
    const flag = featureFlags.find((f) => f.feature_key === featureKey);
    return flag ? flag.is_enabled : true;
  };

  const features =
    featureFlags?.reduce((acc, flag) => {
      acc[flag.feature_key as FeatureKey] = flag.is_enabled;
      return acc;
    }, {} as Record<FeatureKey, boolean>) ?? ({} as Record<FeatureKey, boolean>);

  const refreshFeatures = useCallback(async () => {
    const result = await refetch();

    if (result.error) {
      console.error('Error refreshing feature flags:', result.error);
      toast({
        title: 'Unable to refresh feature flags',
        description:
          (result.error as any)?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    }

    return result.data ?? null;
  }, [refetch, toast]);

  return {
    isFeatureEnabled,
    features,
    loading: enabled ? isLoading || isFetching : false,
    refreshFeatures,
  };
}
