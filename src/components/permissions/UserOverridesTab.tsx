import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserOverridesTabProps {
  companyId: string;
  searchTerm: string;
}

export function UserOverridesTab({ companyId, searchTerm }: UserOverridesTabProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: users = [] } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const { data: features = [] } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('feature_group')
        .order('display_name');

      if (error) throw error;
      return data;
    }
  });

  const { data: userOverrides = [], isLoading } = useQuery({
    queryKey: ['user-overrides', selectedUserId, companyId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', selectedUserId)
        .eq('company_id', companyId);

      if (error) throw error;
      return data;
    }
  });

  const toggleOverride = useMutation({
    mutationFn: async ({ featureId, granted }: { featureId: string; granted: boolean }) => {
      const existing = userOverrides.find(o => o.feature_id === featureId);

      if (existing) {
        const { error } = await supabase
          .from('user_permissions')
          .update({ granted })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Get the feature to get its feature_key
        const feature = features.find(f => f.id === featureId);
        const { error } = await supabase
          .from('user_permissions')
          .insert([{ 
            user_id: selectedUserId, 
            company_id: companyId, 
            feature_id: featureId, 
            granted,
            permission: feature?.feature_key as any || 'view_dashboard' as any // Use feature_key for backward compatibility
          } as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
      toast.success('User override updated');
    },
    onError: () => toast.error('Failed to update override')
  });

  const deleteOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', overrideId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['effective-permissions'] });
      toast.success('Override removed');
    },
    onError: () => toast.error('Failed to remove override')
  });

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  // Get feature details for each override
  const overridesWithFeatures = userOverrides.map(override => ({
    ...override,
    feature: features.find(f => f.id === override.feature_id)
  }));

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          User overrides have highest precedence and will override role-based permissions. Use sparingly for exceptions.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium">Select User</label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user..." />
          </SelectTrigger>
          <SelectContent>
            {users.map(user => (
              <SelectItem key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUserId && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Permission Overrides for {selectedUser?.name}
            </h3>
            {overridesWithFeatures.length > 0 && (
              <Badge variant="secondary">
                {overridesWithFeatures.length} override{overridesWithFeatures.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {overridesWithFeatures.length > 0 && (
                <div className="space-y-3">
                  {overridesWithFeatures
                    .filter(override => {
                      if (!searchTerm) return true;
                      const featureName = override.feature?.display_name || 'Unknown Feature';
                      const featureKey = override.feature?.feature_key || '';
                      return featureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             featureKey.toLowerCase().includes(searchTerm.toLowerCase());
                    })
                    .map(override => (
                      <div key={override.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="font-medium text-base">
                            {override.feature?.display_name || 'Unknown Feature'}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {override.feature?.feature_key || override.permission || 'N/A'}
                          </div>
                          {override.feature?.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {override.feature.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={override.granted ? "default" : "destructive"} className="min-w-[70px] justify-center">
                              {override.granted ? 'Allowed' : 'Denied'}
                            </Badge>
                            <Switch
                              checked={override.granted}
                              onCheckedChange={(granted) => 
                                toggleOverride.mutate({ featureId: override.feature_id, granted })
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOverride.mutate(override.id)}
                            className="hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {overridesWithFeatures.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  No permission overrides configured for this user
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
