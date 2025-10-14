import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface FeatureFlagsTabProps {
  companyId: string;
  searchTerm: string;
}

export function FeatureFlagsTab({ companyId, searchTerm }: FeatureFlagsTabProps) {
  const queryClient = useQueryClient();

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['company-features', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_features')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      return data;
    }
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ featureId, enabled }: { featureId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('company_features')
        .update({ enabled })
        .eq('id', featureId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-features', companyId] });
      toast.success('Feature flag updated');
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Company Feature Flags</h3>
        <p className="text-sm text-muted-foreground">
          Enable or disable entire feature modules for this company.
        </p>
      </div>

      <div className="space-y-2">
        {features
          .filter(f => f.feature_key.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(feature => (
            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">{feature.feature_key}</div>
              </div>
              <Switch 
                checked={feature.enabled}
                onCheckedChange={(enabled) => toggleFeature.mutate({ featureId: feature.id, enabled })}
              />
            </div>
          ))}
      </div>

      {features.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No feature flags configured
        </div>
      )}
    </div>
  );
}
