import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

interface OffboardingFormData {
  user_name: string;
  user_email: string;
  department: string;
  last_working_day: string;
  manager_name: string;
  forward_email_to: string;
  additional_notes: string;
}

export const UserOffboardingRequestForm = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [sharedMailboxes, setSharedMailboxes] = useState<string[]>([]);
  const [newMailbox, setNewMailbox] = useState('');
  const [returnLaptop, setReturnLaptop] = useState(false);
  const [returnPhone, setReturnPhone] = useState(false);
  const [returnOther, setReturnOther] = useState('');
  const [disableAccounts, setDisableAccounts] = useState(true);
  const [exitInterviewCompleted, setExitInterviewCompleted] = useState(false);
  const [office365Users, setOffice365Users] = useState<ComboboxOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OffboardingFormData>();

  // Check if user has permission to see Office 365 users dropdown
  const canUseOffice365Dropdown = ['manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  useEffect(() => {
    if (selectedCompany?.id) {
      loadApplications();
      if (canUseOffice365Dropdown) {
        loadOffice365Users();
      }
    }
  }, [selectedCompany?.id, canUseOffice365Dropdown]);

  const loadApplications = async () => {
    try {
      if (!selectedCompany?.id) return;

      const { data: companyApps } = await supabase
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
      
      if (companyApps) {
        const apps = companyApps
          .map(ca => ca.applications)
          .filter(app => app && app.active)
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setApplications(apps);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadOffice365Users = async () => {
    setLoadingUsers(true);
    try {
      if (!selectedCompany?.id) return;

      // Fetch ALL users without any limit
      let allUsers: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: users, error } = await supabase
          .from('synced_office365_users')
          .select('id, display_name, mail, user_principal_name, department, job_title')
          .eq('company_id', selectedCompany.id)
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
        const userOptions: ComboboxOption[] = allUsers.map(user => ({
          value: user.id,
          label: user.job_title 
            ? `${user.display_name} - ${user.job_title}`
            : user.mail 
              ? `${user.display_name} (${user.mail})`
              : `${user.display_name} (${user.user_principal_name})`,
        }));
        setOffice365Users(userOptions);
      }
    } catch (error) {
      console.error('Error loading Office 365 users:', error);
      toast.error('Failed to load Office 365 users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    
    // Find the selected user and populate the form
    const { data: user, error } = await supabase
      .from('synced_office365_users')
      .select('display_name, mail, user_principal_name, department, job_title')
      .eq('id', userId)
      .single();

    if (!error && user) {
      setValue('user_name', user.display_name || '');
      setValue('user_email', user.mail || user.user_principal_name || '');
      setValue('department', user.department || '');
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
          request_type: 'user_offboarding',
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

  const onSubmit = async (data: OffboardingFormData) => {
    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to submit a request');
        return;
      }

      const { error } = await supabase
        .from('user_offboarding_requests')
        .insert([{
          company_id: selectedCompany?.id as string,
          requested_by: user.id,
          user_name: data.user_name,
          user_email: data.user_email,
          department: data.department,
          last_working_day: data.last_working_day,
          manager_name: data.manager_name,
          return_laptop: returnLaptop,
          return_phone: returnPhone,
          return_other: returnOther || null,
          disable_accounts: disableAccounts,
          revoke_applications: selectedApps.length > 0 ? selectedApps : null,
          remove_shared_mailboxes: sharedMailboxes.length > 0 ? sharedMailboxes : null,
          forward_email_to: data.forward_email_to || null,
          exit_interview_completed: exitInterviewCompleted,
          additional_notes: data.additional_notes || null,
          status: 'submitted' as any
        }]);

      if (error) throw error;

      // Upload attachments
      if (attachments.length > 0) {
        const { data: offboardingRequests } = await supabase
          .from('user_offboarding_requests')
          .select('id')
          .eq('requested_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (offboardingRequests) {
          await uploadAttachments(offboardingRequests.id);
        }
      }

      toast.success('User offboarding request submitted successfully!');
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
          <CardTitle>User Information</CardTitle>
          <CardDescription>Details of the user being offboarded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUseOffice365Dropdown && office365Users.length > 0 && (
            <div>
              <Label htmlFor="office365_user">Select User from Office 365</Label>
              <Combobox
                options={office365Users}
                value={selectedUserId}
                onValueChange={handleUserSelect}
                placeholder={loadingUsers ? "Loading users..." : "Select user..."}
                searchPlaceholder="Search users..."
                emptyText="No users found."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Or enter details manually below
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_name">User Name *</Label>
              <Input
                id="user_name"
                {...register('user_name', { required: 'User name is required' })}
              />
              {errors.user_name && (
                <p className="text-sm text-destructive mt-1">{errors.user_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="user_email">User Email *</Label>
              <Input
                id="user_email"
                type="email"
                {...register('user_email', { required: 'Email is required' })}
              />
              {errors.user_email && (
                <p className="text-sm text-destructive mt-1">{errors.user_email.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="last_working_day">Last Working Day *</Label>
            <Input
              id="last_working_day"
              type="date"
              {...register('last_working_day', { required: 'Last working day is required' })}
            />
            {errors.last_working_day && (
              <p className="text-sm text-destructive mt-1">{errors.last_working_day.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="manager_name">Manager Name</Label>
            <Input id="manager_name" {...register('manager_name')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Asset Return</CardTitle>
          <CardDescription>Company assets to be returned</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="return_laptop"
              checked={returnLaptop}
              onCheckedChange={(checked) => setReturnLaptop(checked as boolean)}
            />
            <Label htmlFor="return_laptop" className="cursor-pointer">Return Laptop</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="return_phone"
              checked={returnPhone}
              onCheckedChange={(checked) => setReturnPhone(checked as boolean)}
            />
            <Label htmlFor="return_phone" className="cursor-pointer">Return Phone</Label>
          </div>

          <div>
            <Label htmlFor="return_other">Other Assets to Return</Label>
            <Input
              id="return_other"
              value={returnOther}
              onChange={(e) => setReturnOther(e.target.value)}
              placeholder="e.g., Key cards, badges, etc."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Revocation</CardTitle>
          <CardDescription>Access rights to be removed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="disable_accounts"
              checked={disableAccounts}
              onCheckedChange={(checked) => setDisableAccounts(checked as boolean)}
            />
            <Label htmlFor="disable_accounts" className="cursor-pointer">
              Disable All User Accounts
            </Label>
          </div>

          {applications.length > 0 && (
            <div>
              <Label>Revoke Application Access</Label>
              <div className="space-y-2 mt-2">
                {applications.map(app => (
                  <div key={app.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`app-${app.id}`}
                      checked={selectedApps.includes(app.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedApps([...selectedApps, app.name]);
                        } else {
                          setSelectedApps(selectedApps.filter(name => name !== app.name));
                        }
                      }}
                    />
                    <Label htmlFor={`app-${app.id}`} className="cursor-pointer">
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

          <div>
            <Label>Remove from Shared Mailboxes</Label>
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
            <Label htmlFor="forward_email_to">Forward Emails To</Label>
            <Input
              id="forward_email_to"
              type="email"
              {...register('forward_email_to')}
              placeholder="manager@company.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exit_interview"
              checked={exitInterviewCompleted}
              onCheckedChange={(checked) => setExitInterviewCompleted(checked as boolean)}
            />
            <Label htmlFor="exit_interview" className="cursor-pointer">
              Exit Interview Completed
            </Label>
          </div>

          <div>
            <Label htmlFor="additional_notes">Additional Notes</Label>
            <Textarea
              id="additional_notes"
              {...register('additional_notes')}
              rows={4}
              placeholder="Any additional information or special requirements..."
            />
          </div>
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
          Submit Offboarding Request
        </Button>
      </div>
    </form>
  );
};
