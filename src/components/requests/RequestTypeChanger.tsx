import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RequestType {
  id: string;
  name: string;
}

interface RequestTypeChangerProps {
  requestId: string;
  currentTypeId?: string;
  requestUserId: string;
  onTypeChanged: () => void;
}

export function RequestTypeChanger({
  requestId,
  currentTypeId,
  requestUserId,
  onTypeChanged,
}: RequestTypeChangerProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  // Only managers can change request type
  if (!isManager) {
    return null;
  }

  useEffect(() => {
    loadRequestTypes();
  }, []);

  const loadRequestTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('request_types')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRequestTypes(data || []);
    } catch (error) {
      console.error('Error loading request types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (newTypeId: string) => {
    if (newTypeId === currentTypeId) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          request_type_id: newTypeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Type Updated',
        description: 'Request type has been changed successfully',
      });

      onTypeChanged();
    } catch (error) {
      console.error('Error updating request type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request type',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading types...</p>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="type-select">Change Request Type</Label>
      <Select
        value={currentTypeId || ''}
        onValueChange={handleTypeChange}
        disabled={updating}
      >
        <SelectTrigger id="type-select">
          <SelectValue placeholder="Select type..." />
        </SelectTrigger>
        <SelectContent>
          {requestTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Change the request type classification
      </p>
    </div>
  );
}
