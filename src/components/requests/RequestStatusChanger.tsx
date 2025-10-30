import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RequestStatus } from '@/types/request';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RequestStatusChangerProps {
  requestId: string;
  currentStatus: RequestStatus;
  requestUserId: string;
  onStatusChanged: () => void;
}

export function RequestStatusChanger({
  requestId,
  currentStatus,
  requestUserId,
  onStatusChanged,
}: RequestStatusChangerProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const isCreator = user?.id === requestUserId;
  const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Determine available statuses based on permissions
  const getAvailableStatuses = (): RequestStatus[] => {
    if (isManager) {
      // Managers can set any status
      return ['open', 'in_progress', 'completed'];
    } else if (isCreator) {
      // Creators can only mark as completed
      return currentStatus === 'completed' ? [] : ['completed'];
    }
    return [];
  };

  const availableStatuses = getAvailableStatuses();

  // Don't show the component if user has no permission to change status
  if (availableStatuses.length === 0) {
    return null;
  }

  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (newStatus === currentStatus) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Request status changed to ${newStatus.replace('_', ' ')}`,
      });

      onStatusChanged();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusLabel = (status: RequestStatus): string => {
    const labels: Record<RequestStatus, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      completed: 'Complete',
    };
    return labels[status];
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="status-select">Change Status</Label>
      <Select
        value={currentStatus}
        onValueChange={(value) => handleStatusChange(value as RequestStatus)}
        disabled={updating}
      >
        <SelectTrigger id="status-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {isManager ? (
            <>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Complete</SelectItem>
            </>
          ) : isCreator ? (
            <SelectItem value="completed">Complete</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      {isCreator && !isManager && (
        <p className="text-xs text-muted-foreground">
          You can mark this request as complete when resolved
        </p>
      )}
      {isManager && (
        <p className="text-xs text-muted-foreground">
          Change the status of this request
        </p>
      )}
    </div>
  );
}
