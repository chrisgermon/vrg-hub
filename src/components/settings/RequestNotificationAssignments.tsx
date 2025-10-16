import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { Users, Mail, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const REQUEST_TYPES = [
  { value: 'hardware', label: 'Hardware Requests' },
  { value: 'marketing', label: 'Marketing Requests' },
  { value: 'toner', label: 'Toner Requests' },
  { value: 'department_request', label: 'Department Requests' },
  { value: 'user_account', label: 'User Account Requests' },
];

const DEPARTMENTS = [
  'IT',
  'Marketing',
  'Finance',
  'HR',
  'Facility Services',
  'Office Services',
  'Accounts Payable',
];

const NOTIFICATION_LEVELS = [
  { value: 'all', label: 'All Notifications (New + Updates)' },
  { value: 'new_only', label: 'New Requests Only' },
  { value: 'updates_only', label: 'Updates Only' },
];

export function RequestNotificationAssignments() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationLevel, setNotificationLevel] = useState('all');

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['request-notification-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('request_notification_assignments')
        .select('*')
        .order('request_type');
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      if (!selectedType || selectedUsers.length === 0) {
        throw new Error('Please select request type and at least one user');
      }

      const { error } = await supabase
        .from('request_notification_assignments')
        .insert({
          request_type: selectedType,
          department: selectedDepartment || null,
          assignee_ids: selectedUsers,
          notification_level: notificationLevel,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-notification-assignments'] });
      toast.success('Notification assignment created');
      setSelectedType('');
      setSelectedDepartment('');
      setSelectedUsers([]);
      setNotificationLevel('all');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create assignment');
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('request_notification_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request-notification-assignments'] });
      toast.success('Assignment deleted');
    },
    onError: () => {
      toast.error('Failed to delete assignment');
    },
  });

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.email || 'Unknown User';
  };

  if (assignmentsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Request Notification Assignments
          </CardTitle>
          <CardDescription>
            Assign users to receive email and SMS notifications for specific request types
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Request Type *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notification Level *</Label>
              <Select value={notificationLevel} onValueChange={setNotificationLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign Users *</Label>
              <Select
                value={selectedUsers.join(',')}
                onValueChange={(value) => {
                  if (value && !selectedUsers.includes(value)) {
                    setSelectedUsers([...selectedUsers, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select users to assign" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUsers.length > 0 && (
              <div className="col-span-full space-y-2">
                <Label>Selected Users:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(userId => (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {getUserName(userId)}
                      <button
                        onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="col-span-full">
              <Button 
                onClick={() => createAssignment.mutate()}
                disabled={!selectedType || selectedUsers.length === 0}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Current Assignments</h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments configured yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map(assignment => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {REQUEST_TYPES.find(t => t.value === assignment.request_type)?.label}
                        </Badge>
                        {assignment.department && (
                          <Badge variant="secondary">{assignment.department}</Badge>
                        )}
                        <Badge variant="default" className="text-xs">
                          {NOTIFICATION_LEVELS.find(l => l.value === assignment.notification_level)?.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignment.assignee_ids?.map((userId: string) => (
                          <span key={userId} className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {getUserName(userId)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAssignment.mutate(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notification Settings
          </CardTitle>
          <CardDescription>
            Users can enable SMS notifications in their profile settings. Email is always enabled by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Email notifications are sent by default for all assigned users</p>
            <p>• SMS notifications are optional and must be enabled by each user</p>
            <p>• Users can configure their notification preferences in Settings → Notifications</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
