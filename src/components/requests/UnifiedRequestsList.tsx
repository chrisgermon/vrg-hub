import React, { useState, useEffect } from 'react';
import { formatAUDate } from '@/lib/dateUtils';
import { 
  Eye, 
  Edit, 
  Trash2, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  MailOpen, 
  Send, 
  Monitor, 
  Search, 
  Filter, 
  X, 
  RefreshCw, 
  Droplets, 
  CheckCircle2, 
  Laptop, 
  Sparkles, 
  Briefcase,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResizableTable, ResizableTableHeader, ResizableTableBody, ResizableTableRow, ResizableTableHead, ResizableTableCell } from '@/components/ui/table-resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useIsMobile } from '@/hooks/use-mobile';
import type { HardwareRequest, RequestStatus, RequestPriority } from '@/types/request';

interface UnifiedRequest {
  id: string;
  type: 'hardware' | 'user_account' | 'marketing' | 'toner' | 'department';
  title: string;
  description?: string;
  status: RequestStatus | string;
  priority?: RequestPriority;
  amount?: number;
  currency?: string;
  created_at: string;
  user_id: string;
  company_id: string;
  company_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  department?: string;
  sub_department?: string;
  originalData: any;
}

interface UnifiedRequestsListProps {
  onEdit?: (request: HardwareRequest) => void;
  onEditMarketing?: (request: any) => void;
  onEditToner?: (request: any) => void;
  onEditDepartment?: (request: any) => void;
  onEditUserAccount?: (request: any) => void;
  onView?: (request: HardwareRequest) => void;
  onViewUserAccount?: (request: any) => void;
  onViewMarketing?: (request: any) => void;
  onViewToner?: (request: any) => void;
  onViewDepartment?: (request: any) => void;
  showAllRequests?: boolean;
  initialStatusFilter?: string | null;
  filterMode?: 'all' | 'my-requests' | 'assigned-to-me' | 'inbox';
}

export function UnifiedRequestsList({ 
  onEdit,
  onEditMarketing,
  onEditToner,
  onEditDepartment,
  onEditUserAccount,
  onView, 
  onViewUserAccount,
  onViewMarketing,
  onViewToner,
  onViewDepartment,
  showAllRequests = false,
  initialStatusFilter = null,
  filterMode = 'all'
}: UnifiedRequestsListProps) {
  const [requests, setRequests] = useState<UnifiedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<UnifiedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [companies, setCompanies] = useState<Map<string, string>>(new Map());
  const [selectedTonerRequest, setSelectedTonerRequest] = useState<string | null>(null);
  const [tonerEta, setTonerEta] = useState('');
  const [tonerTracking, setTonerTracking] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const { profile, userRole, company: userCompany } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const isMobile = useIsMobile();

  const isSuperAdmin = userRole === 'super_admin';
  const isInboxMode = filterMode === 'inbox';
  
  // No special Crowd IT treatment

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    fetchAllRequests();
  }, [profile, showAllRequests, selectedCompany, filterMode]);

  useEffect(() => {
    applyFilters();
  }, [requests, searchQuery, statusFilter, typeFilter, priorityFilter, companyFilter, sortColumn, sortDirection]);

  const fetchAllRequests = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Fetch all companies first if showing all requests
      if (showAllRequests) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name');
        
        if (companiesData) {
          const companyMap = new Map(companiesData.map(c => [c.id, c.name]));
          setCompanies(companyMap);
        }
      }

      // Fetch hardware requests
      let hardwareQuery = supabase
        .from('hardware_requests')
        .select('*');

      const companyId = selectedCompany?.id || profile.company_id;
      
      if (filterMode === 'inbox') {
        hardwareQuery = hardwareQuery.eq('status', 'inbox');
        if (companyId) {
          hardwareQuery = hardwareQuery.eq('company_id', companyId);
        }
      } else if (filterMode === 'my-requests') {
        hardwareQuery = hardwareQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (filterMode === 'assigned-to-me') {
        hardwareQuery = hardwareQuery.or(`manager_id.eq.${profile.user_id},admin_id.eq.${profile.user_id}`).neq('status', 'inbox');
        if (companyId) {
          hardwareQuery = hardwareQuery.eq('company_id', companyId);
        }
      } else if (!showAllRequests) {
        hardwareQuery = hardwareQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (companyId) {
        hardwareQuery = hardwareQuery.eq('company_id', companyId);
      }

      const { data: hardwareData, error: hardwareError } = await hardwareQuery
        .order('created_at', { ascending: false });

      if (hardwareError) throw hardwareError;

      // Fetch user account requests
      let userAccountQuery = supabase
        .from('user_account_requests')
        .select('*');

      if (filterMode === 'inbox') {
        userAccountQuery = userAccountQuery.eq('status', 'inbox');
        if (companyId) {
          userAccountQuery = userAccountQuery.eq('company_id', companyId);
        }
      } else if (filterMode === 'my-requests') {
        userAccountQuery = userAccountQuery.eq('requested_by', profile.user_id).neq('status', 'inbox');
      } else if (filterMode === 'assigned-to-me') {
        userAccountQuery = userAccountQuery.eq('admin_id', profile.user_id).neq('status', 'inbox');
        if (companyId) {
          userAccountQuery = userAccountQuery.eq('company_id', companyId);
        }
      } else if (!showAllRequests) {
        userAccountQuery = userAccountQuery.eq('requested_by', profile.user_id).neq('status', 'inbox');
      } else if (companyId) {
        userAccountQuery = userAccountQuery.eq('company_id', companyId);
      }

      const { data: userAccountData, error: userAccountError } = await userAccountQuery
        .order('created_at', { ascending: false });

      if (userAccountError) throw userAccountError;

      // Fetch marketing requests
      let marketingQuery = supabase
        .from('marketing_requests')
        .select('*');

      if (filterMode === 'inbox') {
        marketingQuery = marketingQuery.eq('status', 'inbox');
        if (companyId) {
          marketingQuery = marketingQuery.eq('company_id', companyId);
        }
      } else if (filterMode === 'my-requests') {
        marketingQuery = marketingQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (filterMode === 'assigned-to-me') {
        marketingQuery = marketingQuery.or(`manager_id.eq.${profile.user_id},admin_id.eq.${profile.user_id}`).neq('status', 'inbox');
        if (companyId) {
          marketingQuery = marketingQuery.eq('company_id', companyId);
        }
      } else if (!showAllRequests) {
        marketingQuery = marketingQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (companyId) {
        marketingQuery = marketingQuery.eq('company_id', companyId);
      }

      const { data: marketingData, error: marketingError } = await marketingQuery
        .order('created_at', { ascending: false });

      if (marketingError) throw marketingError;

      // Fetch toner requests
      let tonerQuery = supabase
        .from('toner_requests')
        .select('*');

      if (filterMode === 'inbox') {
        tonerQuery = tonerQuery.eq('status', 'inbox');
        if (companyId) {
          tonerQuery = tonerQuery.eq('company_id', companyId);
        }
      } else if (filterMode === 'my-requests') {
        tonerQuery = tonerQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (filterMode === 'assigned-to-me') {
        // Toner requests don't have explicit assignments, skip for now
        tonerQuery = tonerQuery.eq('user_id', profile.user_id).eq('id', 'none').neq('status', 'inbox'); // Return empty
      } else if (!showAllRequests) {
        tonerQuery = tonerQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (companyId) {
        tonerQuery = tonerQuery.eq('company_id', companyId);
      }

      const { data: tonerData, error: tonerError } = await tonerQuery
        .order('created_at', { ascending: false });

      if (tonerError) throw tonerError;

      // Fetch department requests
      let departmentQuery = supabase
        .from('department_requests')
        .select('*');

      if (filterMode === 'inbox') {
        departmentQuery = departmentQuery.eq('status', 'inbox');
        if (companyId) {
          departmentQuery = departmentQuery.eq('company_id', companyId);
        }
      } else if (filterMode === 'my-requests') {
        departmentQuery = departmentQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (filterMode === 'assigned-to-me') {
        departmentQuery = departmentQuery.eq('assigned_to', profile.user_id).neq('status', 'inbox');
        if (companyId) {
          departmentQuery = departmentQuery.eq('company_id', companyId);
        }
      } else if (!showAllRequests) {
        departmentQuery = departmentQuery.eq('user_id', profile.user_id).neq('status', 'inbox');
      } else if (companyId) {
        departmentQuery = departmentQuery.eq('company_id', companyId);
      }

      const { data: departmentData, error: departmentError } = await departmentQuery
        .order('created_at', { ascending: false });

      if (departmentError) throw departmentError;

      // Combine and transform all types of requests
      const hardwareRequests: UnifiedRequest[] = (hardwareData || []).map(req => ({
        id: req.id,
        type: 'hardware' as const,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: req.priority,
        amount: req.total_amount,
        currency: req.currency,
        created_at: req.created_at,
        user_id: req.user_id,
        company_id: req.company_id,
        company_name: companies.get(req.company_id),
        assigned_to: req.admin_id || req.manager_id,
        originalData: req
      }));

      const userAccountRequests: UnifiedRequest[] = (userAccountData || []).map(req => ({
        id: req.id,
        type: 'user_account' as const,
        title: `User Account: ${req.first_name} ${req.last_name}`,
        description: `${req.email} - ${req.job_title || 'N/A'}`,
        status: req.status,
        priority: undefined,
        amount: undefined,
        currency: undefined,
        created_at: req.created_at,
        user_id: req.requested_by,
        company_id: req.company_id,
        company_name: companies.get(req.company_id),
        assigned_to: req.admin_id,
        originalData: req
      }));

      const marketingRequests: UnifiedRequest[] = (marketingData || []).map(req => ({
        id: req.id,
        type: 'marketing' as const,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: req.priority,
        amount: undefined,
        currency: undefined,
        created_at: req.created_at,
        user_id: req.user_id,
        company_id: req.company_id,
        company_name: companies.get(req.company_id),
        assigned_to: req.admin_id || req.manager_id,
        originalData: req
      }));

      const tonerRequests: UnifiedRequest[] = (tonerData || []).map(req => ({
        id: req.id,
        type: 'toner' as const,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: undefined,
        amount: undefined,
        currency: undefined,
        created_at: req.created_at,
        user_id: req.user_id,
        company_id: req.company_id,
        company_name: companies.get(req.company_id),
        originalData: req
      }));

      const departmentRequests: UnifiedRequest[] = (departmentData || []).map(req => ({
        id: req.id,
        type: 'department' as const,
        title: req.title,
        description: req.description,
        status: req.status,
        priority: req.priority as RequestPriority,
        amount: undefined,
        currency: undefined,
        created_at: req.created_at,
        user_id: req.user_id,
        company_id: req.company_id,
        company_name: companies.get(req.company_id),
        assigned_to: req.assigned_to,
        department: req.department,
        sub_department: req.sub_department,
        originalData: req
      }));

      // Merge and sort by date
      const allRequests = [...hardwareRequests, ...userAccountRequests, ...marketingRequests, ...tonerRequests, ...departmentRequests]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch assigned user names
      const assignedUserIds = [...new Set(allRequests.map(r => r.assigned_to).filter(Boolean))];
      if (assignedUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', assignedUserIds);

        if (profilesData) {
          const profileMap = new Map(profilesData.map(p => [
            p.user_id, 
            p.name || 'Unknown'
          ]));

          // Add assigned user names to requests
          allRequests.forEach(request => {
            if (request.assigned_to) {
              request.assigned_to_name = profileMap.get(request.assigned_to);
            }
          });
        }
      }

      setRequests(allRequests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(query) ||
        req.description?.toLowerCase().includes(query) ||
        req.company_name?.toLowerCase().includes(query) ||
        req.status.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(req => 
          req.status.includes('pending') || req.status === 'submitted'
        );
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter(req => 
          ['approved', 'ordered', 'delivered'].includes(req.status)
        );
      } else {
        filtered = filtered.filter(req => req.status === statusFilter);
      }
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(req => {
        if (req.type === 'department') {
          // For department requests, match against the department field
          return req.department === typeFilter;
        }
        return req.type === typeFilter;
      });
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(req => req.priority === priorityFilter);
    }

    // Apply company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter(req => req.company_id === companyFilter);
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
          case 'request-number':
            aVal = a.originalData?.request_number || '';
            bVal = b.originalData?.request_number || '';
            break;
          case 'type':
            aVal = a.type;
            bVal = b.type;
            break;
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'created':
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
          case 'assigned':
            aVal = a.assigned_to_name || '';
            bVal = b.assigned_to_name || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredRequests(filtered);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline opacity-0 group-hover:opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 inline" />
      : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
    setCompanyFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || 
                           priorityFilter !== 'all' || companyFilter !== 'all';

  const getStatusBadge = (status: RequestStatus | string) => {
    const statusConfig: Record<string, { variant: any, icon: any, label: string }> = {
      draft: { variant: 'secondary' as const, icon: FileText, label: 'Draft' },
      submitted: { variant: 'outline' as const, icon: Clock, label: 'Submitted' },
      pending_manager_approval: { variant: 'secondary' as const, icon: Clock, label: 'Pending Manager' },
      pending_admin_approval: { variant: 'secondary' as const, icon: Clock, label: 'Pending Admin' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      declined: { variant: 'destructive' as const, icon: XCircle, label: 'Declined' },
      ordered: { variant: 'default' as const, icon: CheckCircle, label: 'Ordered' },
      delivered: { variant: 'default' as const, icon: CheckCircle, label: 'Delivered' },
      cancelled: { variant: 'destructive' as const, icon: XCircle, label: 'Cancelled' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, icon: FileText, label: status };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority?: RequestPriority) => {
    if (!priority) return null;

    const priorityConfig = {
      low: { variant: 'outline' as const, label: 'Low' },
      medium: { variant: 'secondary' as const, label: 'Medium' },
      high: { variant: 'default' as const, label: 'High' },
      urgent: { variant: 'destructive' as const, label: 'Urgent' },
    };

    const config = priorityConfig[priority];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (request: UnifiedRequest) => {
    const type = request.type;
    let Icon, label;
    
    if (type === 'hardware') {
      Icon = Laptop;
      label = 'Hardware';
    } else if (type === 'user_account') {
      Icon = UserPlus;
      label = 'User Account';
    } else if (type === 'toner') {
      Icon = Droplets;
      label = 'Toner';
    } else if (type === 'department') {
      Icon = Briefcase;
      label = request.department?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Department';
    } else {
      const requestType = request.originalData?.request_type || '';
      if (requestType === 'fax_blast') {
        Icon = Send;
        label = 'Marketing - Fax Blast';
      } else if (requestType === 'email_blast') {
        Icon = MailOpen;
        label = 'Marketing - Email Blast';
      } else if (requestType === 'website_update') {
        Icon = Monitor;
        label = 'Marketing - Website';
      } else {
        Icon = Sparkles;
        label = 'Marketing';
      }
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleDelete = async (request: UnifiedRequest) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const table = request.type === 'hardware' ? 'hardware_requests' : 'user_account_requests';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request deleted successfully',
      });

      fetchAllRequests();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    }
  };

  const canEdit = (request: UnifiedRequest) => {
    // Department requests, user account requests, and marketing requests are view-only
    if (request.type === 'user_account' || request.type === 'marketing' || request.type === 'department') return false;
    
    // Tenant admins can edit all company requests
    if (userRole === 'tenant_admin' && request.company_id === profile?.company_id) return true;
    
    // Users can edit their own draft/submitted requests
    return request.user_id === profile?.user_id && ['draft', 'submitted'].includes(request.status);
  };

  const canDelete = (request: UnifiedRequest) => {
    return request.user_id === profile?.user_id && request.status === 'draft';
  };

  const canResend = (request: UnifiedRequest) => {
    return request.user_id === profile?.user_id && request.status === 'declined';
  };

  const canMarkComplete = (request: UnifiedRequest) => {
    return request.type === 'toner' && 
           request.status === 'submitted' && 
           userRole === 'super_admin';
  };

  const handleMarkComplete = async (request: UnifiedRequest) => {
    setSelectedTonerRequest(request.id);
  };

  const handleMarkTonerComplete = async () => {
    if (!selectedTonerRequest) return;

    try {
      const { error } = await supabase
        .from('toner_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: profile?.user_id,
          eta_delivery: tonerEta || null,
          tracking_link: tonerTracking || null,
        })
        .eq('id', selectedTonerRequest);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Toner request marked as complete',
      });

      setSelectedTonerRequest(null);
      setTonerEta('');
      setTonerTracking('');
      fetchAllRequests();
    } catch (error: any) {
      console.error('Error marking toner request complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark request as complete',
        variant: 'destructive',
      });
    }
  };

  const handleResend = async (request: UnifiedRequest) => {
    if (!confirm('Resend this request for approval?')) return;

    try {
      const table = request.type === 'hardware' ? 'hardware_requests' : 
                    request.type === 'user_account' ? 'user_account_requests' :
                    'marketing_requests';
      
      const updates: any = {
        status: 'submitted',
        declined_by: null,
        declined_at: null,
        decline_reason: null,
      };

      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request resent for approval',
      });

      fetchAllRequests();
    } catch (error: any) {
      console.error('Error resending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to resend request',
        variant: 'destructive',
      });
    }
  };

  const handleView = (request: UnifiedRequest) => {
    if (request.type === 'hardware') {
      onView?.(request.originalData);
    } else if (request.type === 'user_account') {
      onViewUserAccount?.(request.originalData);
    } else if (request.type === 'marketing') {
      onViewMarketing?.(request.originalData);
    } else if (request.type === 'toner') {
      onViewToner?.(request.originalData);
    } else if (request.type === 'department') {
      onViewDepartment?.(request.originalData);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {showAllRequests ? 'All Requests' : 'My Requests'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchAllRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter and Search Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                <SelectItem value="facility_services">Facility Services</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="it_service_desk">IT Service Desk</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="marketing_service">Marketing Service</SelectItem>
                <SelectItem value="office_services">Office Services</SelectItem>
                <SelectItem value="technology_training">Technology Training</SelectItem>
                <SelectItem value="toner">Toner</SelectItem>
                <SelectItem value="user_account">User Account</SelectItem>
              </SelectContent>
            </Select>

            {!isInboxMode && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending_manager_approval">Pending Manager</SelectItem>
                  <SelectItem value="pending_admin_approval">Pending Admin</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            {showAllRequests && companies.size > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {Array.from(companies.entries()).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="text-sm text-muted-foreground flex items-center">
              {filteredRequests.length} of {requests.length} requests
            </div>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">
              {hasActiveFilters ? 'No matching requests' : 'No requests found'}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters.'
                : showAllRequests 
                  ? 'No requests have been submitted yet.'
                  : "You haven't created any requests yet."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            {isMobile ? (
              <div className="space-y-3">
                {filteredRequests.map((request) => {
                  const typeBadge = getTypeBadge(request);
                  return (
                    <Card 
                      key={`${request.type}-${request.id}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleView(request)}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {typeBadge}
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {request.originalData?.request_number || 'N/A'}
                            </code>
                          </div>
                          {getPriorityBadge(request.priority)}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-sm mb-1">{request.title}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatAUDate(request.created_at)}</span>
                          {request.assigned_to_name && (
                            <span className="truncate ml-2">→ {request.assigned_to_name}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Desktop Table View */
              <div className="overflow-x-auto">
                <ResizableTable storageKey="unified-requests-table">
              <ResizableTableHeader>
                <ResizableTableRow>
                  <ResizableTableHead 
                    columnId="request-number" 
                    minWidth={120} 
                    maxWidth={200}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('request-number')}
                  >
                    Request #{getSortIcon('request-number')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="type" 
                    minWidth={100} 
                    maxWidth={200}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('type')}
                  >
                    Type{getSortIcon('type')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="title" 
                    minWidth={200} 
                    maxWidth={500}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('title')}
                  >
                    Title{getSortIcon('title')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="status" 
                    minWidth={120} 
                    maxWidth={200}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('status')}
                  >
                    Status{getSortIcon('status')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="priority" 
                    minWidth={100} 
                    maxWidth={150}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('priority')}
                  >
                    Priority{getSortIcon('priority')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="created" 
                    minWidth={120} 
                    maxWidth={200}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('created')}
                  >
                    Created{getSortIcon('created')}
                  </ResizableTableHead>
                  <ResizableTableHead 
                    columnId="assigned" 
                    minWidth={120} 
                    maxWidth={250}
                    className="cursor-pointer hover:bg-muted/50 group"
                    onClick={() => handleSort('assigned')}
                  >
                    Assigned To{getSortIcon('assigned')}
                  </ResizableTableHead>
                </ResizableTableRow>
              </ResizableTableHeader>
              <ResizableTableBody>
                {filteredRequests.map((request) => {
                  const typeBadge = getTypeBadge(request);
                  const isSelected = selectedRequestId === request.id;
                  return (
                  <ResizableTableRow 
                    key={`${request.type}-${request.id}`}
                    onClick={() => setSelectedRequestId(request.id)}
                    onDoubleClick={() => handleView(request)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 hover:bg-primary/15' : ''
                    }`}
                  >
                    <ResizableTableCell>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {request.originalData?.request_number || 'N/A'}
                      </code>
                    </ResizableTableCell>
                    <ResizableTableCell>{typeBadge}</ResizableTableCell>
                    <ResizableTableCell>
                      <div className="font-medium">{request.title}</div>
                    </ResizableTableCell>
                    <ResizableTableCell>{getStatusBadge(request.status)}</ResizableTableCell>
                    <ResizableTableCell>{getPriorityBadge(request.priority)}</ResizableTableCell>
                    <ResizableTableCell>
                      {formatAUDate(request.created_at)}
                    </ResizableTableCell>
                    <ResizableTableCell>
                      {request.assigned_to_name ? (
                        <span className="text-sm">{request.assigned_to_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </ResizableTableCell>
                  </ResizableTableRow>
                  );
                })}
              </ResizableTableBody>
                </ResizableTable>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!selectedTonerRequest} onOpenChange={(open) => !open && setSelectedTonerRequest(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Toner Request Complete</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eta">ETA Delivery Date (Optional)</Label>
            <Input
              id="eta"
              type="date"
              value={tonerEta}
              onChange={(e) => setTonerEta(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Link (Optional)</Label>
            <Input
              id="tracking"
              type="url"
              placeholder="https://..."
              value={tonerTracking}
              onChange={(e) => setTonerTracking(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedTonerRequest(null)}>
            Cancel
          </Button>
          <Button onClick={handleMarkTonerComplete}>
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}