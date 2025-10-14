import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, CheckCircle, XCircle, Clock, Download, CalendarIcon, Search, Info, Zap, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { formatAUDate } from "@/lib/dateUtils";
import * as XLSX from "xlsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FaxLog {
  id: string;
  notifyre_fax_id: string;
  recipient_number: string;
  recipient_name: string | null;
  status: string;
  error_message: string | null;
  pages_sent: number | null;
  duration_seconds: number | null;
  cost_cents: number | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
}

interface FaxCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  contact_group_id: string | null;
  contact_group_name: string | null;
  document_path: string | null;
  total_recipients: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
  sent_at: string | null;
  created_at: string;
}

export function NotifyreFaxCampaigns() {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<FaxCampaign | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [forceFullSync, setForceFullSync] = useState(false);
  
  // Campaign table sorting
  const [campaignSortField, setCampaignSortField] = useState<keyof FaxCampaign>("sent_at");
  const [campaignSortDirection, setCampaignSortDirection] = useState<"asc" | "desc">("desc");
  
  // Campaign date filters
  const [campaignFromDate, setCampaignFromDate] = useState<Date | undefined>();
  const [campaignToDate, setCampaignToDate] = useState<Date | undefined>();
  
  // Logs table sorting
  const [logSortField, setLogSortField] = useState<keyof FaxLog>("sent_at");
  const [logSortDirection, setLogSortDirection] = useState<"asc" | "desc">("desc");

  const setDateRangeToToday = () => {
    const today = new Date();
    setFromDate(startOfDay(today));
    setToDate(endOfDay(today));
  };

  const setDateRangeToThisWeek = () => {
    const today = new Date();
    setFromDate(startOfWeek(today, { weekStartsOn: 1 })); // Monday
    setToDate(endOfWeek(today, { weekStartsOn: 1 }));
  };

  const setDateRangeToThisMonth = () => {
    const today = new Date();
    setFromDate(startOfMonth(today));
    setToDate(endOfMonth(today));
  };

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["notifyre-campaigns", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("notifyre_fax_campaigns")
        .select("*")
        .eq("company_id", company.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as FaxCampaign[];
    },
    enabled: Boolean(company?.id),
  });

  const { data: lastSync } = useQuery({
    queryKey: ["notifyre-last-sync", company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from("notifyre_sync_history")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    },
    enabled: Boolean(company?.id),
  });

  const { data: campaignLogs } = useQuery({
    queryKey: ["notifyre-logs", selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];

      const { data, error } = await supabase
        .from("notifyre_fax_logs")
        .select("*")
        .eq("campaign_id", selectedCampaign.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data as FaxLog[];
    },
    enabled: Boolean(selectedCampaign?.id),
  });

  const syncMutation = useMutation({
    mutationFn: async (options?: { forceFullSync?: boolean }) => {
      // For differential sync, dates are optional
      const shouldUseDates = (fromDate && toDate) || options?.forceFullSync;

      const { data, error } = await supabase.functions.invoke("sync-notifyre-fax-logs", {
        body: { 
          company_id: company?.id,
          from_date: shouldUseDates ? fromDate?.toISOString() : undefined,
          to_date: shouldUseDates ? toDate?.toISOString() : undefined,
          force_full_sync: options?.forceFullSync || false
        },
      });

      if (error) {
        // Edge function returned non-2xx
        throw new Error(error.message);
      }
      if (data && (data as any).success === false) {
        throw new Error((data as any).message || 'Sync failed');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifyre-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["notifyre-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifyre-last-sync"] });
      toast.success("Fax campaigns synced successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const downloadCampaignDocument = async (campaignId: string, campaignName: string) => {
    try {
      toast.loading('Downloading campaign document...');
      
      const { data, error } = await supabase.functions.invoke('download-fax-document', {
        body: { campaignId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Download failed');

      // Download the file from the signed URL
      const response = await fetch(data.url);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${campaignName || 'campaign'}_document.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success(data.cached ? 'Campaign document downloaded' : 'Campaign document downloaded and cached');
    } catch (error) {
      toast.dismiss();
      console.error('Error downloading campaign document:', error);
      toast.error('Failed to download campaign document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (campaign: FaxCampaign) => {
    setSelectedCampaign(campaign);
    setStatusFilter("all");
    setDetailsOpen(true);
  };

  const handleCampaignSort = (field: keyof FaxCampaign) => {
    if (campaignSortField === field) {
      setCampaignSortDirection(campaignSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCampaignSortField(field);
      setCampaignSortDirection("asc");
    }
  };

  const handleLogSort = (field: keyof FaxLog) => {
    if (logSortField === field) {
      setLogSortDirection(logSortDirection === "asc" ? "desc" : "asc");
    } else {
      setLogSortField(field);
      setLogSortDirection("asc");
    }
  };

  const getSortIcon = (field: string, currentField: string, direction: "asc" | "desc") => {
    if (field !== currentField) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return direction === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredCampaigns = campaigns
    ?.filter((campaign) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = campaign.campaign_name?.toLowerCase().includes(query) ||
          campaign.campaign_id.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Date filter
      if (campaignFromDate || campaignToDate) {
        const sentDate = campaign.sent_at ? new Date(campaign.sent_at) : null;
        if (!sentDate) return false;
        
        if (campaignFromDate && sentDate < campaignFromDate) return false;
        if (campaignToDate) {
          const endOfDay = new Date(campaignToDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (sentDate > endOfDay) return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      const aVal = a[campaignSortField];
      const bVal = b[campaignSortField];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return campaignSortDirection === "asc" ? comparison : -comparison;
    }) || [];

  const filteredLogs = campaignLogs
    ?.filter((log) => {
      if (statusFilter === "all") return true;
      // Map UI filter names to database status values
      if (statusFilter === "delivered") {
        return log.status === "successful" || log.status === "delivered";
      }
      return log.status === statusFilter;
    })
    .sort((a, b) => {
      const aVal = a[logSortField];
      const bVal = b[logSortField];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return logSortDirection === "asc" ? comparison : -comparison;
    }) || [];

  const exportToExcel = () => {
    if (!selectedCampaign || !filteredLogs.length) {
      toast.error("No data to export");
      return;
    }

    // Prepare data for Excel
    const exportData = filteredLogs.map((log) => ({
      "Recipient Number": log.recipient_number,
      "Recipient Name": log.recipient_name || "-",
      "Status": log.status,
      "Pages Sent": log.pages_sent || "-",
      "Duration (seconds)": log.duration_seconds || "-",
      "Sent At": log.sent_at ? formatAUDate(log.sent_at) : "-",
      "Delivered At": log.delivered_at ? formatAUDate(log.delivered_at) : "-",
      "Failed At": log.failed_at ? formatAUDate(log.failed_at) : "-",
      "Error Message": log.error_message || "-",
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fax Logs");

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map((row) => String(row[key as keyof typeof row]).length)
      );
      return { wch: Math.min(maxLength + 2, maxWidth) };
    });
    worksheet["!cols"] = colWidths;

    // Generate filename
    const campaignName = selectedCampaign.campaign_name || selectedCampaign.campaign_id;
    const filterSuffix = statusFilter !== "all" ? `_${statusFilter}` : "";
    const filename = `${campaignName}${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    toast.success("Excel report exported successfully");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Fax Campaigns</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Quick Filters:</span>
            <Button variant="outline" size="sm" onClick={setDateRangeToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={setDateRangeToThisWeek}>
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={setDateRangeToThisMonth}>
              This Month
            </Button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => syncMutation.mutate({})}
                      disabled={syncMutation.isPending}
                      variant="default"
                    >
                      <Zap className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      Quick Sync
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Syncs only new data since last sync</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => syncMutation.mutate({ forceFullSync: true })}
                      disabled={syncMutation.isPending || !fromDate || !toDate}
                      variant="outline"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      Full Sync
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Syncs all data in the selected date range</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {lastSync && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
                <Info className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">Last Sync: {formatAUDate(lastSync.created_at)}</span>
                  <span className="text-muted-foreground text-xs">
                    {lastSync.status === 'success' 
                      ? `Downloaded ${lastSync.campaigns_synced} campaigns, ${lastSync.faxes_synced} faxes`
                      : `Failed: ${lastSync.error_message}`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading campaigns...</div>
      ) : campaigns && campaigns.length > 0 ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Filter campaigns by date:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !campaignFromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {campaignFromDate ? format(campaignFromDate, "PP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={campaignFromDate}
                      onSelect={setCampaignFromDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !campaignToDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {campaignToDate ? format(campaignToDate, "PP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={campaignToDate}
                      onSelect={setCampaignToDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(campaignFromDate || campaignToDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCampaignFromDate(undefined);
                    setCampaignToDate(undefined);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {filteredCampaigns.length > 0 ? (
            <Card>
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("campaign_name")}
                      >
                        <div className="flex items-center">
                          Campaign
                          {getSortIcon("campaign_name", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("sent_at")}
                      >
                        <div className="flex items-center">
                          Sent Date
                          {getSortIcon("sent_at", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("total_recipients")}
                      >
                        <div className="flex items-center justify-center">
                          Total
                          {getSortIcon("total_recipients", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("delivered_count")}
                      >
                        <div className="flex items-center justify-center">
                          Delivered
                          {getSortIcon("delivered_count", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("failed_count")}
                      >
                        <div className="flex items-center justify-center">
                          Failed
                          {getSortIcon("failed_count", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCampaignSort("pending_count")}
                      >
                        <div className="flex items-center justify-center">
                          Pending
                          {getSortIcon("pending_count", campaignSortField, campaignSortDirection)}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {campaign.campaign_name || `Campaign ${campaign.campaign_id}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {campaign.campaign_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadCampaignDocument(campaign.id, campaign.campaign_name || campaign.campaign_id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      <TableCell>
                        {campaign.sent_at ? formatAUDate(campaign.sent_at) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {campaign.total_recipients}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {campaign.delivered_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {campaign.failed_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {campaign.pending_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(campaign)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No campaigns match your search criteria.
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No fax campaigns found. Click "Sync Campaigns" to fetch data from Notifyre.
          </CardContent>
        </Card>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {selectedCampaign?.campaign_name || `Campaign ${selectedCampaign?.campaign_id}`}
                </DialogTitle>
                {selectedCampaign?.contact_group_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact Group: {selectedCampaign.contact_group_name}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={!filteredLogs.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </DialogHeader>

          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({campaignLogs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="delivered">
                Delivered ({selectedCampaign?.delivered_count || 0})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({selectedCampaign?.failed_count || 0})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({selectedCampaign?.pending_count || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleLogSort("recipient_name")}
                  >
                    <div className="flex items-center">
                      Recipient
                      {getSortIcon("recipient_name", logSortField, logSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleLogSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon("status", logSortField, logSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleLogSort("pages_sent")}
                  >
                    <div className="flex items-center">
                      Pages
                      {getSortIcon("pages_sent", logSortField, logSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleLogSort("duration_seconds")}
                  >
                    <div className="flex items-center">
                      Duration
                      {getSortIcon("duration_seconds", logSortField, logSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleLogSort("sent_at")}
                  >
                    <div className="flex items-center">
                      Sent
                      {getSortIcon("sent_at", logSortField, logSortDirection)}
                    </div>
                  </TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        {log.recipient_name && <div className="font-medium">{log.recipient_name}</div>}
                        <div className="text-sm text-muted-foreground">{log.recipient_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.pages_sent || '-'}</TableCell>
                    <TableCell>{log.duration_seconds ? `${log.duration_seconds}s` : '-'}</TableCell>
                    <TableCell className="text-sm">
                      {log.sent_at ? formatAUDate(log.sent_at) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-red-600">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter === "all" 
                ? "No logs found for this campaign"
                : `No ${statusFilter} logs found`
              }
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}