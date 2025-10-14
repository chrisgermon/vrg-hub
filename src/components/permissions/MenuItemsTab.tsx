import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MenuItemsTabProps {
  companyId: string;
  searchTerm: string;
}

export function MenuItemsTab({ companyId, searchTerm }: MenuItemsTabProps) {
  const { data: menuFeatures = [], isLoading } = useQuery({
    queryKey: ['menu-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('is_menu_item', true)
        .order('menu_order', { ascending: true });

      if (error) throw error;
      return data;
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
      <Alert>
        <AlertDescription>
          Menu visibility is controlled by role permissions. Users only see menu items for features they can access.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Menu Items ({menuFeatures.length})</h3>
        <div className="grid gap-2">
          {menuFeatures
            .filter(f => 
              f.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              f.feature_key.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(feature => (
              <div key={feature.id} className="p-4 border rounded-lg">
                <div className="font-medium">{feature.display_name}</div>
                <div className="text-sm text-muted-foreground">{feature.feature_key}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
