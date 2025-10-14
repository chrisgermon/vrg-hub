import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

interface HaloSettings {
  id?: string;
  company_id: string;
  halo_client_id: number;
  halo_client_name: string;
  halo_site_id: number | null;
  halo_site_name: string | null;
  halo_default_user_id: number | null;
  halo_default_user_name: string | null;
  auto_create_users: boolean;
}

interface HaloClient {
  id: number;
  name: string;
}

interface HaloSite {
  id: number;
  name: string;
  client_id: number;
}

export function HaloIntegrationSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(false);
  const [fetchingSites, setFetchingSites] = useState(false);
  const [clients, setClients] = useState<HaloClient[]>([]);
  const [sites, setSites] = useState<HaloSite[]>([]);
  const [settings, setSettings] = useState<HaloSettings>({
    company_id: profile?.company_id || "",
    halo_client_id: 0,
    halo_client_name: "",
    halo_site_id: null,
    halo_site_name: null,
    halo_default_user_id: null,
    halo_default_user_name: null,
    auto_create_users: true,
  });

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("halo_integration_settings")
        .select("*")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching HaloPSA settings:", error);
        toast.error("Failed to load HaloPSA settings");
      } else if (data) {
        setSettings(data);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [profile?.company_id]);

  const fetchClients = async () => {
    setFetchingClients(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-halo-data', {
        body: { type: 'clients' },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setClients(data.data.map((client: any) => ({
          id: client.id,
          name: client.name,
        })));
        toast.success(`Loaded ${data.data.length} clients from HaloPSA`);
      }
    } catch (error: any) {
      console.error("Error fetching HaloPSA clients:", error);
      toast.error("Failed to fetch clients from HaloPSA");
    } finally {
      setFetchingClients(false);
    }
  };

  const fetchSites = async (clientId: number) => {
    setFetchingSites(true);
    setSites([]);
    setSettings({ ...settings, halo_site_id: null, halo_site_name: null });
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-halo-data', {
        body: { type: 'sites', clientId },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setSites(data.data.map((site: any) => ({
          id: site.id,
          name: site.name,
          client_id: site.client_id,
        })));
        toast.success(`Loaded ${data.data.length} sites from HaloPSA`);
      }
    } catch (error: any) {
      console.error("Error fetching HaloPSA sites:", error);
      toast.error("Failed to fetch sites from HaloPSA");
    } finally {
      setFetchingSites(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      setSettings({
        ...settings,
        halo_client_id: client.id,
        halo_client_name: client.name,
        halo_site_id: null,
        halo_site_name: null,
      });
      fetchSites(client.id);
    }
  };

  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => s.id === parseInt(siteId));
    if (site) {
      setSettings({
        ...settings,
        halo_site_id: site.id,
        halo_site_name: site.name,
      });
    }
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;

    if (!settings.halo_client_id || !settings.halo_client_name) {
      toast.error("Please select a client");
      return;
    }

    setSaving(true);

    const saveData = {
      ...settings,
      company_id: profile.company_id,
    };

    const { error } = settings.id
      ? await supabase
          .from("halo_integration_settings")
          .update(saveData)
          .eq("id", settings.id)
      : await supabase.from("halo_integration_settings").insert([saveData]);

    if (error) {
      console.error("Error saving HaloPSA settings:", error);
      toast.error("Failed to save HaloPSA settings");
    } else {
      toast.success("HaloPSA settings saved successfully");
      
      if (!settings.id) {
        const { data } = await supabase
          .from("halo_integration_settings")
          .select("*")
          .eq("company_id", profile.company_id)
          .single();
        
        if (data) setSettings(data);
      }
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>HaloPSA Integration</CardTitle>
        <CardDescription>
          Map this company to a HaloPSA client for service desk ticket management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>HaloPSA Client *</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchClients}
                disabled={fetchingClients}
              >
                {fetchingClients ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Load Clients</span>
              </Button>
            </div>
            <Select
              value={settings.halo_client_id?.toString()}
              onValueChange={handleClientChange}
              disabled={clients.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a HaloPSA client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Click "Load Clients" to fetch available clients from HaloPSA
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>HaloPSA Site (Optional)</Label>
            <Select
              value={settings.halo_site_id?.toString() || ""}
              onValueChange={handleSiteChange}
              disabled={!settings.halo_client_id || sites.length === 0 || fetchingSites}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  fetchingSites 
                    ? "Loading sites..." 
                    : !settings.halo_client_id 
                    ? "Select a client first" 
                    : "Select a site (optional)"
                } />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {settings.halo_client_id && sites.length === 0 && !fetchingSites && (
              <p className="text-xs text-muted-foreground">
                No sites available for this client
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="auto_create_users">Auto-create Users</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create users in HaloPSA if they don't exist
              </p>
            </div>
            <Switch
              id="auto_create_users"
              checked={settings.auto_create_users}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_create_users: checked })
              }
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !settings.halo_client_id}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
