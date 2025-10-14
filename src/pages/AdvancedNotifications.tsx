import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Plus, Trash2, Search, X, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanySelector } from '@/components/CompanySelector';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const REQUEST_TYPES = [
  { value: 'hardware', label: 'Hardware Request', subTypes: [] },
  { value: 'toner', label: 'Toner Request', subTypes: [] },
  { value: 'marketing', label: 'Marketing Request', subTypes: [] },
  { value: 'user_account', label: 'User Account', subTypes: [] },
  { value: 'accounts_payable', label: 'Accounts Payable', subTypes: ['EFT payment', 'Staff Reimbursement request', 'General Inquiry'] },
  { value: 'facility_services', label: 'Facility Services', subTypes: ['General maintenance', 'Airconditioning', 'Lighting', 'Cleaning', 'Merchandise', 'Other'] },
  { value: 'finance', label: 'Finance', subTypes: ['Statement request', 'Payroll issues'] },
  { value: 'hr', label: 'HR', subTypes: ['Incident form submission', 'Patient complaint', 'Staff complaint', 'Report HR compliance', 'General support'] },
  { value: 'it_service_desk', label: 'IT Service Desk', subTypes: ['Get IT help', 'Access mail Inbox', 'Remote Access - VPN', 'Computer Support', 'License Support', 'Request New software', 'Request New hardware', 'Mobile Device Issues', 'Permission access', 'Reset Password', 'Printing/printer Issue', 'Work from home equipment', 'General Support'] },
  { 
    value: 'marketing_service', 
    label: 'Marketing Service', 
    subTypes: ['Request MLO to see referrer', 'Referrer complaint'] 
  },
  { value: 'office_services', label: 'Office Services', subTypes: ['Print and Post', 'Couriers and Deliveries', 'Stationary Requests', 'Marketing and Print material request'] },
  { value: 'technology_training', label: 'Technology Training', subTypes: ['Request Kestral training', 'Request PACS training', 'Request Eftpos training', 'Request CT Canon Apps training', 'Request CT Siemens Apps training', 'Request MRI Siemens Apps training', 'Request X-ray Apps Training', 'Request US Canon Apps training', 'Request US Philips Apps training', 'Request US GE Apps training', 'Request Lumicare training'] },
];


interface NotificationConfig {
  id: string;
  request_type: string;
  sub_request_type: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  receive_notifications: boolean;
  can_approve: boolean;
}

export default function AdvancedNotifications() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [users, setUsers] = useState<Array<{ user_id: string; email: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestType, setSelectedRequestType] = useState<string>('hardware');
  const [selectedSubRequestType, setSelectedSubRequestType] = useState<string>('__ALL__');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { profile, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();

  const isSuperAdmin = userRole === 'super_admin';
  const companyId = isSuperAdmin && selectedCompany?.id ? selectedCompany.id : profile?.company_id;

  const selectedTypeData = REQUEST_TYPES.find(t => t.value === selectedRequestType);
  const hasSubTypes = selectedTypeData && selectedTypeData.subTypes.length > 0;

  useEffect(() => {
    loadData();
  }, [companyId, selectedRequestType, selectedSubRequestType]);

  useEffect(() => {
    setSelectedSubRequestType('__ALL__');
  }, [selectedRequestType]);

  const loadData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      // Load users from the company
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, email, name')
        .eq('company_id', companyId)
        .order('name');

      if (usersError) throw usersError;

      // Load notification configs for selected request type
      let configQuery = supabase
        .from('request_type_notifications')
        .select('id, request_type, sub_request_type, user_id, receive_notifications, can_approve')
        .eq('company_id', companyId)
        .eq('request_type', selectedRequestType);

      // Filter by sub_request_type if one is selected
      if (selectedSubRequestType && selectedSubRequestType !== '__ALL__') {
        configQuery = configQuery.eq('sub_request_type', selectedSubRequestType);
      } else if (hasSubTypes) {
        // If sub-types exist but '__ALL__' selected, show only general (null) configs
        configQuery = configQuery.is('sub_request_type', null);
      }

      const { data: configsData, error: configsError } = await configQuery;

      if (configsError) throw configsError;

      // Match configs with user data
      const formattedConfigs = (configsData || []).map((config: any) => {
        const user = usersData?.find(u => u.user_id === config.user_id);
        return {
          id: config.id,
          request_type: config.request_type,
          sub_request_type: config.sub_request_type,
          user_id: config.user_id,
          user_email: user?.email || 'Unknown',
          user_name: user?.name || user?.email || 'Unknown',
          receive_notifications: config.receive_notifications,
          can_approve: config.can_approve,
        };
      });

      setUsers(usersData || []);
      setConfigs(formattedConfigs);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification configurations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId || !companyId) return;

    try {
      const { error } = await supabase
        .from('request_type_notifications')
        .insert({
          company_id: companyId,
          request_type: selectedRequestType,
          sub_request_type: (selectedSubRequestType && selectedSubRequestType !== '__ALL__') ? selectedSubRequestType : null,
          user_id: selectedUserId,
          receive_notifications: true,
          can_approve: false,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User added to notification list',
      });

      setSelectedUserId('');
      loadData();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateConfig = async (id: string, field: 'receive_notifications' | 'can_approve', value: boolean) => {
    try {
      const { error } = await supabase
        .from('request_type_notifications')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setConfigs(configs.map(c => c.id === id ? { ...c, [field]: value } : c));

      toast({
        title: 'Success',
        description: 'Configuration updated',
      });
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast({
        title: 'Error',
        description: 'Failed to update configuration',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveUser = async (id: string) => {
    if (!confirm('Remove this user from notification list?')) return;

    try {
      const { error } = await supabase
        .from('request_type_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User removed from notification list',
      });

      loadData();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user',
        variant: 'destructive',
      });
    }
  };

  const availableUsers = users.filter(
    user => !configs.find(c => c.user_id === user.user_id) &&
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredConfigs = configs.filter(
    config => config.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure notification recipients for requests. Users will receive both in-app and email notifications.
          </p>
        </div>
        {isSuperAdmin && <CompanySelector />}
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Select Request Type</CardTitle>
          <CardDescription>
            Choose the request type to configure notification recipients. Users will receive both in-app and email notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="request-type">Request Type</Label>
            <Select value={selectedRequestType} onValueChange={setSelectedRequestType}>
              <SelectTrigger id="request-type" className="w-full">
                <SelectValue />
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

          {hasSubTypes && (
            <div>
              <Label htmlFor="sub-request-type">Category (Optional)</Label>
              <Select value={selectedSubRequestType} onValueChange={setSelectedSubRequestType}>
                <SelectTrigger id="sub-request-type" className="w-full">
                  <SelectValue placeholder="All (general notifications)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All (general notifications)</SelectItem>
                  {selectedTypeData.subTypes.map(subType => (
                    <SelectItem key={subType} value={subType}>
                      {subType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select a specific category or leave as "All" for general notifications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Add User to {selectedTypeData?.label}
            {selectedSubRequestType && selectedSubRequestType !== '__ALL__' && ` > ${selectedSubRequestType}`}
          </CardTitle>
          <CardDescription>
            Select a user to receive notifications for this {(selectedSubRequestType && selectedSubRequestType !== '__ALL__') ? 'category' : 'request type'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddUser} disabled={!selectedUserId}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configured Users</CardTitle>
              <CardDescription>
                Users who receive notifications for {selectedTypeData?.label}
                {selectedSubRequestType && selectedSubRequestType !== '__ALL__' && ` > ${selectedSubRequestType}`}
                {selectedSubRequestType === '__ALL__' && hasSubTypes && ' (general notifications)'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No users configured</h3>
              <p className="mt-2 text-muted-foreground">
                Add users above to configure notification recipients
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConfigs.map(config => (
                <Card key={config.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{config.user_name}</div>
                        <div className="text-sm text-muted-foreground">{config.user_email}</div>
                        {config.sub_request_type && (
                          <Badge variant="secondary" className="mt-1">
                            {config.sub_request_type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.receive_notifications}
                            onCheckedChange={(checked) => 
                              handleUpdateConfig(config.id, 'receive_notifications', checked)
                            }
                          />
                          <Label className="text-sm">Receive Notifications</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.can_approve}
                            onCheckedChange={(checked) => 
                              handleUpdateConfig(config.id, 'can_approve', checked)
                            }
                          />
                          <Label className="text-sm">Can Approve</Label>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(config.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
