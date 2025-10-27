import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestType: 'hardware' | 'department';
  currentAssignee?: string;
  onSuccess?: () => void;
}

export function ReassignDialog({ 
  open, 
  onOpenChange, 
  requestId,
  requestType,
  currentAssignee,
  onSuccess 
}: ReassignDialogProps) {
  const [assignee, setAssignee] = useState<string>(currentAssignee || '');
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!assignee) {
      toast({
        title: 'Error',
        description: 'Please select a user to assign',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      const tableName = requestType === 'hardware' ? 'hardware_requests' : 'department_requests';
      
      const { error: updateError } = await supabase
        .from(tableName as any)
        .update({ assigned_to: assignee })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add comment about reassignment
      const assignedUser = users.find(u => u.id === assignee);
      const { error: commentError } = await supabase
        .from('request_comments')
        .insert({
          request_id: requestId,
          user_id: user?.id,
          author_name: profile?.full_name || 'System',
          author_email: profile?.email || 'system@example.com',
          content: `Request reassigned to ${assignedUser?.full_name || 'user'}`,
          content_html: `Request reassigned to ${assignedUser?.full_name || 'user'}`,
          is_internal: true,
        });

      if (commentError) throw commentError;

      toast({
        title: 'Request Reassigned',
        description: `Request has been assigned to ${assignedUser?.full_name}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error reassigning request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reassign Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="assignee">Assign To</Label>
            <Select value={assignee} onValueChange={setAssignee} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={saving || loading}>
            {saving ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
