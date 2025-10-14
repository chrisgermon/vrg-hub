import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface SharePointConfigurationProps {
  companyId: string;
}

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
  description?: string;
}

export function SharePointConfiguration({ companyId }: SharePointConfigurationProps) {
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    site_url: "",
    site_id: "",
    folder_path: "/",
  });
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadConfiguration();
    loadSites();
  }, [companyId]);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig({
          site_url: data.site_url || "",
          site_id: data.site_id || "",
          folder_path: data.folder_path || "/",
        });
        setHasExistingConfig(true);
      }
    } catch (error: any) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load SharePoint configuration');
    }
  };

  const loadSites = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('sharepoint-get-sites', {
        body: { company_id: companyId },
      });

      if (error) throw error;

      setSites(data.sites || []);
    } catch (error: any) {
      console.error('Error loading sites:', error);
      toast.error('Failed to load SharePoint sites');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.site_id || !config.site_url) {
      toast.error('Please select a SharePoint site');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (hasExistingConfig) {
        const { error } = await supabase
          .from('sharepoint_configurations')
          .update({
            site_url: config.site_url,
            site_id: config.site_id,
            folder_path: config.folder_path,
          })
          .eq('company_id', companyId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sharepoint_configurations')
          .insert({
            company_id: companyId,
            site_url: config.site_url,
            site_id: config.site_id,
            folder_path: config.folder_path,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast.success('SharePoint configuration saved successfully');
      setHasExistingConfig(true);
      queryClient.invalidateQueries({ queryKey: ['sharepoint-configuration', companyId] });
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSiteSelect = (siteId: string) => {
    const selectedSite = sites.find(s => s.id === siteId);
    if (selectedSite) {
      setConfig({
        ...config,
        site_id: siteId,
        site_url: selectedSite.webUrl,
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SharePoint Document Configuration</CardTitle>
        <CardDescription>
          Configure which SharePoint site and folder to display in Documentation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sites.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-5 w-5" />
            <span>No SharePoint sites found. Make sure Office 365 is connected with SharePoint permissions.</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="site">SharePoint Site</Label>
              <Select value={config.site_id} onValueChange={handleSiteSelect}>
                <SelectTrigger id="site">
                  <SelectValue placeholder="Select a SharePoint site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                      {site.description && ` - ${site.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-path">Folder Path (optional)</Label>
              <Input
                id="folder-path"
                value={config.folder_path}
                onChange={(e) => setConfig({ ...config, folder_path: e.target.value })}
                placeholder="/Documents or / for root"
              />
              <p className="text-sm text-muted-foreground">
                Leave as "/" for root folder, or specify a path like "/Shared Documents"
              </p>
            </div>

            {config.site_url && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Site URL: {config.site_url}</span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !config.site_id}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
