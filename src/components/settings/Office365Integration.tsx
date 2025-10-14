import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import { SharePointConfiguration } from "./SharePointConfiguration";

interface Office365IntegrationProps {
  companyId: string;
}

export const Office365Integration = ({ companyId }: Office365IntegrationProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSharePointConfig, setShowSharePointConfig] = useState(false);
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useQuery({
    queryKey: ['office365-connection', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: syncedData } = useQuery({
    queryKey: ['office365-synced-data', companyId],
    queryFn: async () => {
      // @ts-ignore - Avoiding deep type instantiation error
      const usersQuery = supabase
        .from('synced_office365_users')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      // @ts-ignore - Avoiding deep type instantiation error
      const mailboxesQuery = supabase
        .from('synced_office365_mailboxes')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true);

      const usersResult: any = await usersQuery;
      const mailboxesResult: any = await mailboxesQuery;

      if (usersResult.error) throw usersResult.error;
      if (mailboxesResult.error) throw mailboxesResult.error;

      return {
        users_count: usersResult.data?.length || 0,
        mailboxes_count: mailboxesResult.data?.length || 0,
      };
    },
    enabled: !!connection,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('office365-sync-data', {
        body: { company_id: companyId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const message = [
        `✓ Synced ${data.users_synced} licensed users`,
        data.users_skipped > 0 ? `⊘ Skipped ${data.users_skipped} unlicensed users` : null,
        `✓ Synced ${data.mailboxes_synced} mailboxes`,
        `Total users found: ${data.total_users_found}`,
      ].filter(Boolean).join('\n');
      
      toast.success('Office 365 Sync Complete', {
        description: message,
        duration: 5000,
      });
      
      queryClient.invalidateQueries({ queryKey: ['office365-synced-data', companyId] });
      queryClient.invalidateQueries({ queryKey: ['office365-connection', companyId] });
      queryClient.invalidateQueries({ queryKey: ['synced-office365-users', companyId] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('office365_connections')
        .update({ is_active: false })
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Office 365 disconnected successfully');
      queryClient.invalidateQueries({ queryKey: ['office365-connection', companyId] });
    },
    onError: (error: Error) => {
      toast.error(`Disconnect failed: ${error.message}`);
    },
  });

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const { data, error } = await supabase.functions.invoke('office365-oauth-initiate', {
        body: { company_id: companyId },
      });

      if (error) throw error;

      // Redirect to Microsoft OAuth
      window.location.href = data.authorization_url;
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message}`);
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Office 365 Integration</CardTitle>
          <CardDescription>
            Connect your Office 365 tenant to sync users, mailboxes, and SharePoint documents
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {connection ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium">Connected to Office 365</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tenant ID</p>
                <p className="font-mono text-xs">{connection.tenant_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Synced</p>
                <p className="text-xs">
                  {connection.last_sync_at
                    ? formatAUDateTimeFull(connection.last_sync_at)
                    : 'Never'}
                </p>
              </div>
            </div>

            {syncedData && (
              <div className="flex gap-4">
                <Badge variant="secondary">
                  {syncedData.users_count} Users
                </Badge>
                <Badge variant="secondary">
                  {syncedData.mailboxes_count} Mailboxes
                </Badge>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                variant="default"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowSharePointConfig(!showSharePointConfig)}
                variant="outline"
              >
                <Settings className="mr-2 h-4 w-4" />
                {showSharePointConfig ? 'Hide' : 'Configure'} SharePoint
              </Button>

              <Button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                variant="destructive"
              >
                {disconnectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              <span>Not connected to Office 365</span>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Office 365'
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>

    {connection && showSharePointConfig && (
      <SharePointConfiguration companyId={companyId} />
    )}
  </>
  );
};
