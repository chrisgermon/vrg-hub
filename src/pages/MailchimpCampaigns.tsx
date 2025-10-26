import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Mail, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Campaign {
  id: string;
  web_id: number;
  title: string;
  subject_line: string;
  status: string;
  emails_sent: number;
  send_time: string;
  report_summary: {
    opens: number;
    unique_opens: number;
    clicks: number;
    subscriber_clicks: number;
  };
}

export default function MailchimpCampaigns() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['mailchimp-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-mailchimp-campaigns');
      
      if (error) throw error;
      return data.campaigns as Campaign[];
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Campaign data has been updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh campaign data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      sent: { variant: 'default', icon: CheckCircle },
      sending: { variant: 'secondary', icon: Clock },
      draft: { variant: 'outline', icon: Mail },
      failed: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const sentCampaigns = campaigns?.filter(c => c.status === 'sent') || [];
  const failedCampaigns = campaigns?.filter(c => c.status === 'failed') || [];
  const draftCampaigns = campaigns?.filter(c => c.status === 'draft' || c.status === 'sending') || [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mailchimp Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            View and analyze your email campaign performance
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">Successfully sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">Failed to send</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="sent">Delivered ({sentCampaigns.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedCampaigns.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({draftCampaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CampaignTable campaigns={campaigns || []} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <CampaignTable campaigns={sentCampaigns} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <CampaignTable campaigns={failedCampaigns} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <CampaignTable campaigns={draftCampaigns} getStatusBadge={getStatusBadge} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CampaignTable({ 
  campaigns, 
  getStatusBadge 
}: { 
  campaigns: Campaign[]; 
  getStatusBadge: (status: string) => JSX.Element;
}) {
  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No campaigns found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Opens</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.title}</TableCell>
              <TableCell>{campaign.subject_line}</TableCell>
              <TableCell>{getStatusBadge(campaign.status)}</TableCell>
              <TableCell className="text-right">{campaign.emails_sent.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {campaign.report_summary?.unique_opens || 0}
              </TableCell>
              <TableCell className="text-right">
                {campaign.report_summary?.subscriber_clicks || 0}
              </TableCell>
              <TableCell>
                {campaign.send_time ? new Date(campaign.send_time).toLocaleDateString() : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
