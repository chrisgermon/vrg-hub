import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  Zap,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';

interface RequestMetrics {
  total: number;
  pending: number;
  approved: number;
  totalValue: number;
}

export function RequestMetrics() {
  const [metrics, setMetrics] = useState<RequestMetrics>({
    total: 0,
    pending: 0,
    approved: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { profile, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMetrics();
  }, [profile, selectedCompany]);

  const fetchMetrics = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Base query setup
      let baseQuery = supabase.from('hardware_requests').select('*');
      
      // Filter by selected company
      const companyId = selectedCompany?.id || profile.company_id;
      if (companyId) {
        baseQuery = baseQuery.eq('company_id', companyId);
      }

      // For requesters (when viewing their own company), only show their own requests
      if (userRole === 'requester' && !selectedCompany) {
        baseQuery = baseQuery.eq('user_id', profile.user_id);
      }

      const { data: requests, error } = await baseQuery;
      if (error) throw error;

      const allRequests = requests || [];
      
      // Calculate metrics
      const total = allRequests.length;
      const pending = allRequests.filter(r => 
        r.status.includes('pending') || r.status === 'submitted'
      ).length;
      
      const approved = allRequests.filter(r => 
        ['approved', 'ordered', 'delivered'].includes(r.status)
      ).length;

      const totalValue = allRequests
        .filter(r => ['approved', 'ordered', 'delivered'].includes(r.status))
        .reduce((sum, r) => sum + (r.total_amount || 0), 0);

      setMetrics({
        total,
        pending,
        approved,
        totalValue,
      });
    } catch (error: any) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card 
        className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 cursor-pointer"
        onClick={() => navigate('/requests?filter=all')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Requests</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{metrics.total}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge variant="info" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/50 dark:to-orange-900/50 cursor-pointer"
        onClick={() => navigate('/requests?filter=pending')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</p>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{metrics.pending}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge variant="warning" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {metrics.pending > 5 ? 'High' : 'Normal'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/50 cursor-pointer"
        onClick={() => navigate('/requests?filter=approved')}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Approved</p>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{metrics.approved}</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Badge variant="success" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Processing
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}