import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, FolderOpen, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { ConnectOffice365Button } from '@/components/documentation/ConnectOffice365Button';

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

export function SharePointConfiguration() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [folderPath, setFolderPath] = useState('/');
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    loadCurrentConfig();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setConnected(!!connection);
      
      if (connection) {
        await loadSites();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const loadCurrentConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!connection) return;

      const { data: config } = await supabase
        .from('sharepoint_configurations')
        .select('*')
        .eq('company_id', connection.company_id)
        .eq('is_active', true)
        .maybeSingle();

      if (config) {
        setCurrentConfig(config);
        setSelectedSite(config.site_id || '');
        setFolderPath(config.folder_path || '/');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadSites = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Get company_id from the office365_connections table
      const { data: connection } = await (supabase as any)
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!connection?.company_id) {
        console.error('No Office 365 connection found');
        toast({
          title: 'Error',
          description: 'Please connect to Office 365 first',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('sharepoint-get-sites', {
        body: { company_id: connection.company_id }
      });

      if (error) {
        console.error('SharePoint sites error:', error);
        throw error;
      }

      setSites(data?.sites || []);
      
      if (!data?.sites || data.sites.length === 0) {
        toast({
          title: 'No sites found',
          description: 'No SharePoint sites are accessible with the current connection',
          variant: 'default'
        });
      }
    } catch (error: any) {
      console.error('Error loading sites:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load SharePoint sites',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!selectedSite) {
      toast({
        title: 'Error',
        description: 'Please select a SharePoint site',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: connection } = await supabase
        .from('office365_connections')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!connection?.company_id) {
        throw new Error('Office 365 connection not found or missing company ID');
      }

      const site = sites.find(s => s.id === selectedSite);
      if (!site) {
        throw new Error('Selected site not found. Please try reloading the sites.');
      }

      // Validate site data
      if (!site.id || !site.name || !site.webUrl) {
        throw new Error('Invalid site data. Please select a different site.');
      }

      console.log('Saving SharePoint configuration:', {
        company_id: connection.company_id,
        site_id: site.id,
        site_name: site.name,
        site_url: site.webUrl,
        folder_path: folderPath
      });

      // Save config: update existing company record if present, else insert
      // This avoids ON CONFLICT issues and ensures a single active config per company
      const { data: existingConfig } = await (supabase as any)
        .from('sharepoint_configurations')
        .select('id')
        .eq('company_id', connection.company_id)
        .maybeSingle();

      let saveError: any = null;

      if (existingConfig?.id) {
        const { error } = await (supabase as any)
          .from('sharepoint_configurations')
          .update({
            site_id: site.id,
            site_name: site.name,
            site_url: site.webUrl,
            folder_path: folderPath || '/',
            configured_by: user.id,
            is_active: true,
          })
          .eq('id', existingConfig.id);
        saveError = error;
      } else {
        const { error } = await (supabase as any)
          .from('sharepoint_configurations')
          .insert({
            company_id: connection.company_id,
            site_id: site.id,
            site_name: site.name,
            site_url: site.webUrl,
            folder_path: folderPath || '/',
            configured_by: user.id,
            is_active: true,
          });
        saveError = error;
      }

      if (saveError) {
        console.error('Save error:', saveError);
        throw new Error(`Failed to save configuration: ${saveError.message}`);
      }

      toast({
        title: 'Success',
        description: 'SharePoint configuration saved successfully'
      });

      await loadCurrentConfig();
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            SharePoint Configuration
          </CardTitle>
          <CardDescription>
            Connect Office 365 to configure SharePoint access for your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect your Office 365 account to configure SharePoint document access
            </p>
            <ConnectOffice365Button />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          SharePoint Configuration
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure which SharePoint location is visible to all users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentConfig && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="w-4 h-4" />
              Current Configuration
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site:</span>
                <span className="font-medium">{currentConfig.site_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Path:</span>
                <span className="font-medium">{currentConfig.folder_path}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sharepoint-site">SharePoint Site</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSites}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger id="sharepoint-site">
              <SelectValue placeholder="Select a SharePoint site" />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : (
                sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="folder-path">Folder Path (optional)</Label>
          <Input
            id="folder-path"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="/"
          />
          <p className="text-xs text-muted-foreground">
            Leave as "/" to show the root folder, or specify a path like "/Documents/Public"
          </p>
        </div>

        <Button 
          onClick={saveConfiguration} 
          disabled={loading || !selectedSite}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}
