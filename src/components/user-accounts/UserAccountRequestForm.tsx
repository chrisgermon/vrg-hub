import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { Loader2, Plus, X, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LocationSelect } from '@/components/ui/location-select';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

interface UserAccountFormData {
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  job_title: string;
  manager_name: string;
  start_date: string;
  office365_license: string;
}

const OFFICE365_LICENSES = [
  { 
    value: 'microsoft_365_business_basic', 
    label: 'Microsoft 365 Business Basic',
    description: 'Web & mobile versions of Office apps, 1TB OneDrive storage, Teams, Exchange. No desktop apps.'
  },
  { 
    value: 'microsoft_365_business_standard', 
    label: 'Microsoft 365 Business Standard',
    description: 'Desktop Office apps, web & mobile apps, 1TB OneDrive, Teams, Exchange, SharePoint. Best for small businesses.'
  },
  { 
    value: 'microsoft_365_business_premium', 
    label: 'Microsoft 365 Business Premium',
    description: 'All Standard features plus advanced security, device management, threat protection, and information protection.'
  },
  { 
    value: 'microsoft_365_e3', 
    label: 'Microsoft 365 E3',
    description: 'Enterprise-grade: Desktop Office apps, unlimited OneDrive, advanced compliance, eDiscovery, data loss prevention.'
  },
  { 
    value: 'microsoft_365_e5', 
    label: 'Microsoft 365 E5',
    description: 'Premium enterprise: All E3 features plus advanced security, analytics, voice calling, and advanced compliance tools.'
  },
  { 
    value: 'office_365_e1', 
    label: 'Office 365 E1',
    description: 'Web-only Office apps, Exchange, OneDrive (1TB), SharePoint, Teams. No desktop apps. Budget enterprise option.'
  },
  { 
    value: 'office_365_e3', 
    label: 'Office 365 E3',
    description: 'Desktop Office apps, unlimited OneDrive, Exchange, SharePoint, Teams. No advanced security features.'
  },
  { 
    value: 'office_365_e5', 
    label: 'Office 365 E5',
    description: 'All E3 features plus advanced analytics, voice calling, meeting recording, and cloud PBX.'
  },
];

export const UserAccountRequestForm = () => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompanyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [sharedMailboxes, setSharedMailboxes] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [newMailbox, setNewMailbox] = useState('');
  const [newRole, setNewRole] = useState('');
  const [managerName, setManagerName] = useState<string>('');
  const [office365Managers, setOffice365Managers] = useState<ComboboxOption[]>([]);
  const [isOffice365Connected, setIsOffice365Connected] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<UserAccountFormData>();

  useEffect(() => {
    if (selectedCompany?.id) {
      loadApplications();
      checkOffice365Connection();
    }
  }, [selectedCompany?.id]);

  const loadApplications = async () => {
    try {
      if (!selectedCompany?.id) return;

      // Load applications assigned to this company via junction table
      const { data: companyApps, error } = await supabase
        .from('company_applications')
        .select(`
          applications (
            id,
            name,
            description,
            active
          )
        `)
        .eq('company_id', selectedCompany.id);
      
      if (error) {
        console.error('Error loading applications:', error);
        return;
      }
      
      if (companyApps) {
        const apps = companyApps
          .map(ca => ca.applications)
          .filter(app => app && app.active)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setApplications(apps);
      }
    } catch (error) {
      console.error('Error in loadApplications:', error);
    }
  };

  const checkOffice365Connection = async () => {
    try {
      if (!selectedCompany?.id) return;

      // Load Office 365 managers if any exist for this company (treat presence of synced users as connection)
      setIsOffice365Connected(true);
      await loadOffice365Managers(selectedCompany.id);
    } catch (error) {
      console.error('Error checking Office 365 connection:', error);
    }
  };

  const loadOffice365Managers = async (companyId: string) => {
    setLoadingManagers(true);
    try {
      // Fetch ALL users without any limit
      let allUsers: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: users, error } = await supabase
          .from('synced_office365_users')
          .select('id, display_name, mail, user_principal_name, job_title')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .not('display_name', 'is', null)
          .order('display_name')
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (users && users.length > 0) {
          allUsers = allUsers.concat(users);
          from += batchSize;
          hasMore = users.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (allUsers.length > 0) {
        const managerOptions: ComboboxOption[] = allUsers.map(user => ({
          value: user.display_name,
          label: user.job_title 
            ? `${user.display_name} - ${user.job_title}`
            : user.mail 
              ? `${user.display_name} (${user.mail})`
              : `${user.display_name} (${user.user_principal_name})`,
        }));
        setOffice365Managers(managerOptions);
      }
    } catch (error) {
      console.error('Error loading Office 365 managers:', error);
      toast.error('Failed to load managers from Office 365');
    } finally {
      setLoadingManagers(false);
    }
  };

  const addMailbox = () => {
    if (newMailbox.trim() && !sharedMailboxes.includes(newMailbox.trim())) {
      setSharedMailboxes([...sharedMailboxes, newMailbox.trim()]);
      setNewMailbox('');
    }
  };

  const removeMailbox = (mailbox: string) => {
    setSharedMailboxes(sharedMailboxes.filter(m => m !== mailbox));
  };

  const addRole = () => {
    if (newRole.trim() && !roles.includes(newRole.trim())) {
      setRoles([...roles, newRole.trim()]);
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setRoles(roles.filter(r => r !== role));
  };

  const uploadAttachments = async (requestId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const uploadPromises = attachments.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('request_attachments')
        .insert({
          request_type: 'user_account',
          request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
          attachment_type: 'general',
        });

      if (dbError) throw dbError;
    });

    await Promise.all(uploadPromises);
  };

  const onSubmit = async (data: UserAccountFormData) => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to submit a request');
        return;
      }

      // Create the user account request
      const { data: request, error: requestError } = await supabase
        .from('user_account_requests')
        .insert([{
          company_id: selectedCompany?.id as string,
          requested_by: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          department: data.department,
          job_title: data.job_title,
          manager_name: managerName || data.manager_name,
          start_date: data.start_date,
          shared_mailboxes: sharedMailboxes,
          roles: roles,
          office365_license: data.office365_license as any,
          business_justification: null,
          status: 'submitted' as any
        }])
        .select()
        .single();

      if (requestError) throw requestError;

      // Add selected applications
      if (selectedApps.length > 0) {
        const appInserts = selectedApps.map(appId => ({
          user_account_request_id: request.id,
          application_id: appId
        }));

        const { error: appsError } = await supabase
          .from('user_account_applications')
          .insert(appInserts);

        if (appsError) throw appsError;
      }

      // Upload attachments
      if (attachments.length > 0) {
        await uploadAttachments(request.id);
      }

      toast.success('User account request submitted successfully!');
      navigate('/requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New User Details</CardTitle>
          <CardDescription>Enter the details for the new user account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                {...register('first_name', { required: 'First name is required' })}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                {...register('last_name', { required: 'Last name is required' })}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Primary Location</Label>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <LocationSelect
                    companyId={selectedCompany?.id}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select location"
                  />
                )}
              />
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input id="job_title" {...register('job_title')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manager_name">Manager Name</Label>
              {isOffice365Connected && office365Managers.length > 0 ? (
                <Combobox
                  options={office365Managers}
                  value={managerName}
                  onValueChange={(value) => {
                    setManagerName(value);
                    setValue('manager_name', value);
                  }}
                  placeholder={loadingManagers ? "Loading managers..." : "Select manager..."}
                  searchPlaceholder="Search managers..."
                  emptyText="No managers found."
                />
              ) : (
                <Input 
                  id="manager_name" 
                  {...register('manager_name')}
                  placeholder={loadingManagers ? "Loading..." : "Enter manager name"}
                  disabled={loadingManagers}
                />
              )}
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access & Permissions</CardTitle>
          <CardDescription>Configure access rights and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="office365_license">Office 365 License</Label>
            <Controller
              name="office365_license"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a license type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <TooltipProvider>
                      {OFFICE365_LICENSES.map(license => (
                        <div key={license.value} className="flex items-center justify-between group">
                          <SelectItem value={license.value} className="flex-1">
                            {license.label}
                          </SelectItem>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <div className="px-2 py-1 cursor-help">
                                <Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs bg-popover border shadow-lg z-50">
                              <p className="text-sm">{license.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </TooltipProvider>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label>Shared Mailboxes</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newMailbox}
                onChange={(e) => setNewMailbox(e.target.value)}
                placeholder="Enter mailbox name"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMailbox())}
              />
              <Button type="button" onClick={addMailbox} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sharedMailboxes.map(mailbox => (
                <Badge key={mailbox} variant="secondary">
                  {mailbox}
                  <button
                    type="button"
                    onClick={() => removeMailbox(mailbox)}
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Roles</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Enter role name"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
              />
              <Button type="button" onClick={addRole} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge key={role} variant="secondary">
                  {role}
                  <button
                    type="button"
                    onClick={() => removeRole(role)}
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {applications.length > 0 && (
            <div>
              <Label>Applications Access</Label>
              <div className="space-y-2 mt-2">
                {applications.map(app => (
                  <div key={app.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={app.id}
                      checked={selectedApps.includes(app.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedApps([...selectedApps, app.id]);
                        } else {
                          setSelectedApps(selectedApps.filter(id => id !== app.id));
                        }
                      }}
                    />
                    <Label htmlFor={app.id} className="cursor-pointer">
                      {app.name}
                      {app.description && (
                        <span className="text-sm text-muted-foreground ml-2">
                          - {app.description}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Upload any supporting documents</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone
            onFilesSelected={(files) => setAttachments(prev => [...prev, ...files])}
            accept="image/*,.pdf,.doc,.docx"
            multiple
            maxSize={20}
            label=""
            description="PDF, DOC, DOCX, or images up to 20MB each"
          />
          <FileList
            files={attachments}
            onRemove={(index) => setAttachments(prev => prev.filter((_, i) => i !== index))}
            className="mt-4"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/requests')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Request
        </Button>
      </div>
    </form>
  );
};