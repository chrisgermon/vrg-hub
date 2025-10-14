import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';

interface PendingApprovalsWidgetProps {
  title?: string;
}

export function PendingApprovalsWidget({ title = "Pending Approvals" }: PendingApprovalsWidgetProps) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { profile, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingCount();
  }, [profile, selectedCompany]);

  const fetchPendingCount = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let statusFilters: Array<'submitted' | 'pending_manager_approval' | 'pending_admin_approval'> = [];
      
      if (userRole === 'manager') {
        statusFilters = ['submitted', 'pending_manager_approval'];
      } else if (userRole === 'tenant_admin') {
        statusFilters = ['submitted', 'pending_manager_approval', 'pending_admin_approval'];
      } else if (userRole === 'super_admin') {
        statusFilters = ['submitted', 'pending_manager_approval', 'pending_admin_approval'];
      }

      if (statusFilters.length === 0) {
        setCount(0);
        return;
      }

      let query = supabase
        .from('hardware_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', statusFilters);

      const companyId = selectedCompany?.id || profile.company_id;
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { count: requestCount, error } = await query;

      if (error) throw error;
      setCount(requestCount || 0);
    } catch (error: any) {
      console.error('Error fetching pending approvals count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show if user has approver role and there are pending requests
  if (!['manager', 'tenant_admin', 'super_admin'].includes(userRole || '')) {
    return null;
  }

  if (count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>No pending approvals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            ACTION REQUIRED
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">{title}</h3>
          <p className="text-muted-foreground text-sm">
            You have {count}+ request(s) awaiting approval
          </p>
        </div>
        <Button 
          onClick={() => navigate('/approvals')}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          Review Now
        </Button>
      </CardContent>
    </Card>
  );
}
