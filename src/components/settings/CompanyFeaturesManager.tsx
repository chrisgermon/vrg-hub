import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
}

interface CompanyFeature {
  id: string;
  company_id: string;
  feature_key: string;
  enabled: boolean;
}

const AVAILABLE_FEATURES = [
  { key: 'hardware_requests', label: 'Hardware Requests', description: 'Request new hardware equipment' },
  { key: 'toner_requests', label: 'Toner Requests', description: 'Order printer toner' },
  { key: 'user_accounts', label: 'User Account Requests', description: 'Request new user accounts and offboarding' },
  { key: 'marketing_requests', label: 'Marketing Requests', description: 'Submit marketing requests (fax, email, website updates)' },
  { key: 'department_requests', label: 'Department Requests', description: 'Submit requests to various departments (Facility, Office, Finance, IT, HR, etc.)' },
  { key: 'monthly_newsletter', label: 'Monthly Newsletter', description: 'Contribute to monthly newsletter' },
  { key: 'modality_management', label: 'Modality Management', description: 'View and manage DICOM modality details' },
  { key: 'print_ordering', label: 'Print Ordering Forms', description: 'Access print ordering forms for various brands' },
  { key: 'front_chat', label: 'Front Live Chat Widget', description: 'Enable Front chat widget for live support' },
];

interface CompanyFeaturesManagerProps {
  companyId: string;
}

export function CompanyFeaturesManager({ companyId }: CompanyFeaturesManagerProps) {
  const [features, setFeatures] = useState<CompanyFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load features for this specific company
      const { data: featuresData, error: featuresError } = await supabase
        .from('company_features')
        .select('*')
        .eq('company_id', companyId)
        .order('feature_key');

      if (featuresError) throw featuresError;
      setFeatures(featuresData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company features',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (featureKey: string, currentValue: boolean) => {
    const updateKey = `${companyId}-${featureKey}`;
    setUpdating(updateKey);

    try {
      const existingFeature = features.find(f => f.feature_key === featureKey);

      if (existingFeature) {
        // Update existing feature
        const { error } = await supabase
          .from('company_features')
          .update({ enabled: !currentValue })
          .eq('id', existingFeature.id);

        if (error) throw error;
      } else {
        // Create new feature entry
        const { error } = await supabase
          .from('company_features')
          .insert({
            company_id: companyId,
            feature_key: featureKey,
            enabled: !currentValue,
          });

        if (error) throw error;
      }

      // Reload data to reflect changes
      await loadData();

      toast({
        title: 'Success',
        description: 'Feature setting updated',
      });
    } catch (error) {
      console.error('Error updating feature:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature setting',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    const feature = features.find(f => f.feature_key === featureKey);
    return feature?.enabled !== false; // Default to true if not found
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {AVAILABLE_FEATURES.map(feature => {
            const enabled = isFeatureEnabled(feature.key);
            const updateKey = `${companyId}-${feature.key}`;
            const isUpdating = updating === updateKey;

            return (
              <div
                key={feature.key}
                className="flex items-center justify-between space-x-4 rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`${companyId}-${feature.key}`} className="text-base font-medium">
                    {feature.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Switch
                    id={`${companyId}-${feature.key}`}
                    checked={enabled}
                    onCheckedChange={() => handleToggleFeature(feature.key, enabled)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}