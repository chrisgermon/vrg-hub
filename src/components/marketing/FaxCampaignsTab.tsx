import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Download, Loader2, Send, CheckCircle, XCircle, Clock, FileSpreadsheet, Eye } from "lucide-react";
import { formatAUDateTimeFull } from "@/lib/dateUtils";
import * as XLSX from 'xlsx';

interface FaxCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string;
  contact_group_id: string | null;
  contact_group_name: string | null;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  sent_at: string;
  document_path: string | null;
  created_at: string;
}

interface FaxLog {
  id: string;
  notifyre_fax_id: string;
  recipient_number: string;
  recipient_name: string | null;
  status: string;
  error_message: string | null;
  pages_sent: number | null;
  cost_cents: number | null;
  sent_at: string;
  delivered_at: string | null;
  failed_at: string | null;
}

interface SyncHistory {
  id: string;
  created_at: string;
  status: string;
  campaigns_synced: number;
  faxes_synced: number;
}

export const FaxCampaignsTab = () => {
  const [campaigns, setCampaigns] = useState<FaxCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<FaxCampaign | null>(null);
  const [faxLogs, setFaxLogs] = useState<FaxLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastSync, setLastSync] = useState<SyncHistory | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadLastSyncTime();
  }, []);

  const loadLastSyncTime = async () => {
    try {
      const { data, error } = await supabase
        .from('notifyre_sync_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setLastSync(data);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifyre_fax_campaigns')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load fax campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignLogs = async (campaignId: string) => {
    try {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('notifyre_fax_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setFaxLogs(data || []);
    } catch (error) {
      console.error('Error loading fax logs:', error);
      toast.error('Failed to load fax logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSyncFaxes = async () => {
    try {
      setSyncing(true);
      toast.info('Syncing fax campaigns from Notifyre...');

      const { data, error } = await supabase.functions.invoke('sync-notifyre-fax-logs', {
        body: { force_full_sync: false }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Synced ${data.campaigns} campaigns with ${data.faxes} faxes`);
        await loadCampaigns();
        await loadLastSyncTime();
      } else {
        toast.error(data?.message || 'Failed to sync faxes');
      }
    } catch (error) {
      console.error('Error syncing faxes:', error);
      toast.error('Failed to sync fax campaigns');
    } finally {
      setSyncing(false);
    }
  };

  const handleViewCampaign = (campaign: FaxCampaign) => {
    setSelectedCampaign(campaign);
    loadCampaignLogs(campaign.id);
  };

  const handleExportCampaign = () => {
    if (!selectedCampaign) return;

    const campaignInfo = [
      ['Fax Campaign Details'],
      ['Campaign Name', selectedCampaign.campaign_name],
      ['Total Recipients', selectedCampaign.total_recipients],
      ['Delivered', selectedCampaign.delivered_count],
      ['Failed', selectedCampaign.failed_count],
      ['Pending', selectedCampaign.pending_count],
      ['Sent At', formatAUDateTimeFull(selectedCampaign.sent_at)],
      [],
      ['Recipient Details']
    ];

    const logData = faxLogs.map(log => ({
      'Recipient Name': log.recipient_name || '-',
      'Recipient Number': log.recipient_number,
      'Status': log.status,
      'Pages Sent': log.pages_sent || '-',
      'Cost': log.cost_cents ? `$${(log.cost_cents / 100).toFixed(2)}` : '-',
      'Sent At': log.sent_at ? formatAUDateTimeFull(log.sent_at) : '-',
      'Error': log.error_message || '-'
    }));

    const ws = XLSX.utils.aoa_to_sheet(campaignInfo);
    XLSX.utils.sheet_add_json(ws, logData, { origin: -1 });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Campaign Details');
    
    const fileName = `${selectedCampaign.campaign_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("Campaign details exported!");
  };

  const handleExportAllCampaigns = () => {
    if (campaigns.length === 0) {
      toast.error("No campaigns to export");
      return;
    }

    const exportData = campaigns.map(campaign => ({
      'Campaign Name': campaign.campaign_name,
      'Total Recipients': campaign.total_recipients,
      'Delivered': campaign.delivered_count,
      'Failed': campaign.failed_count,
      'Pending': campaign.pending_count,
      'Delivery Rate': campaign.total_recipients > 0 
        ? `${(campaign.delivered_count / campaign.total_recipients * 100).toFixed(2)}%`
        : '0%',
      'Sent At': formatAUDateTimeFull(campaign.sent_at)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fax Campaigns');
    
    const fileName = `Fax_Campaigns_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success("Report generated successfully!");
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (['delivered', 'sent', 'successful'].includes(statusLower)) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> Delivered</Badge>;
    }
    if (['failed', 'error'].includes(statusLower)) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
  };

  const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered_count, 0);
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failed_count, 0);
  const totalPending = campaigns.reduce((sum, c) => sum + c.pending_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {lastSync && (
              <span>Last synced: {formatAUDateTimeFull(lastSync.created_at)}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSyncFaxes} disabled={syncing} variant="outline">
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Faxes
              </>
            )}
          </Button>
          <Button onClick={handleExportAllCampaigns} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalDelivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fax campaigns found. Click "Sync Faxes" to load campaigns from Notifyre.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                      <TableCell>{campaign.total_recipients}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">{campaign.delivered_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-medium">{campaign.failed_count}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-medium">{campaign.pending_count}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAUDateTimeFull(campaign.sent_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCampaign(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedCampaign?.campaign_name}</DialogTitle>
              <Button onClick={handleExportCampaign} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedCampaign?.total_recipients}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{selectedCampaign?.delivered_count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{selectedCampaign?.failed_count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{selectedCampaign?.pending_count}</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Fax Delivery Log ({faxLogs.length})</h3>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : faxLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fax logs found for this campaign
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Sent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faxLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.recipient_name || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{log.recipient_number}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell>{log.pages_sent || '-'}</TableCell>
                          <TableCell>
                            {log.cost_cents ? `$${(log.cost_cents / 100).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.sent_at ? formatAUDateTimeFull(log.sent_at) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
