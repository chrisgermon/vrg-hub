import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface ApprovalSettingsProps {
  requireApproval: boolean;
  approverId: string | null;
  onRequireApprovalChange: (enabled: boolean) => void;
  onApproverIdChange: (id: string | null) => void;
}

export function ApprovalSettings({
  requireApproval,
  approverId,
  onRequireApprovalChange,
  onApproverIdChange,
}: ApprovalSettingsProps) {
  const [approvers, setApprovers] = useState<Profile[]>([]);

  useEffect(() => {
    loadApprovers();
  }, []);

  const loadApprovers = async () => {
    // Get users with manager or admin roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['manager', 'tenant_admin', 'super_admin']);

    if (rolesError) {
      console.error('Error loading user roles:', rolesError);
      return;
    }

    const userIds = userRoles?.map(ur => ur.user_id) || [];

    if (userIds.length === 0) {
      setApprovers([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_active', true)
      .in('id', userIds)
      .order('full_name');

    if (error) {
      console.error('Error loading approvers:', error);
      return;
    }

    setApprovers(data || []);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <UserCheck className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">Approval Settings</h3>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="require-approval" className="text-sm font-medium">
            Require Approval
          </Label>
          <p className="text-xs text-muted-foreground">
            Requests using this form will need approval before processing
          </p>
        </div>
        <Switch
          id="require-approval"
          checked={requireApproval}
          onCheckedChange={onRequireApprovalChange}
        />
      </div>

      {requireApproval && (
        <div className="space-y-2">
          <Label htmlFor="approver" className="text-sm font-medium">
            Default Approver
          </Label>
          <Select 
            value={approverId || 'auto'} 
            onValueChange={(value) => onApproverIdChange(value === 'auto' ? null : value)}
          >
            <SelectTrigger id="approver">
              <SelectValue placeholder="Select an approver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                Auto-assign based on location/brand
              </SelectItem>
              {approvers.map(approver => (
                <SelectItem key={approver.id} value={approver.id}>
                  {approver.full_name || approver.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {approverId 
              ? 'All requests will be sent to the selected approver'
              : 'System will automatically assign approver based on requester\'s brand and location'}
          </p>
        </div>
      )}
    </div>
  );
}
