import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSelect } from '@/components/ui/location-select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

const departmentFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  sub_department: z.string().min(1, 'Sub-department is required'),
  location_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().min(1, 'Description is required'),
  assigned_to: z.string().optional(),
});

type FormData = z.infer<typeof departmentFormSchema>;

interface DepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
  subDepartments: string[];
  onSuccess?: () => void;
}

export function DepartmentRequestForm({ 
  department, 
  departmentLabel,
  subDepartments,
  onSuccess,
}: DepartmentRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      title: '',
      sub_department: '',
      location_id: '',
      priority: 'medium',
      description: '',
      assigned_to: '',
    },
  });

  // Fetch assignable users from Office 365 and profiles
  useEffect(() => {
    const fetchAssignableUsers = async () => {
      if (!selectedCompany) return;

      try {
        // Fetch regular profiles only (must correspond to auth.users)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .eq('company_id', selectedCompany.id)
          .order('name');

        const users: Array<{ id: string; name: string; email: string }> = [];

        if (profiles) {
          profiles.forEach(p => {
            users.push({
              id: p.user_id,
              name: p.name || 'Unknown',
              email: p.email || ''
            });
          });
        }

        setAssignableUsers(users);
      } catch (error) {
        console.error('Error fetching assignable users:', error);
      }
    };

    fetchAssignableUsers();
  }, [selectedCompany]);

  const uploadAttachments = async (requestId: string) => {
    const uploadPromises = attachments.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('request_attachments')
        .insert({
          request_type: 'department',
          request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user?.id,
          attachment_type: 'general',
        });

      if (dbError) throw dbError;
    });

    await Promise.all(uploadPromises);
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !selectedCompany) return;

    setIsSubmitting(true);

    try {
      // Get user's profile to use the correct company_id for RLS
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error('User profile not found');
      }

      // Resolve location name to ID if provided
      let locationId: string | null = null;
      if (data.location_id) {
        const { data: loc } = await supabase
          .from('company_locations')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .eq('name', data.location_id)
          .maybeSingle();
        locationId = loc?.id ?? null;
      }

      // Validate UUID for assigned_to (avoid 400 on invalid uuid)
      const isUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

      const requestData = {
        user_id: user.id,
        company_id: userProfile.company_id, // Use profile company_id to match RLS policy
        department,
        sub_department: data.sub_department,
        location_id: locationId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'submitted',
        assigned_to: isUuid(data.assigned_to) ? data.assigned_to : null,
        assigned_at: isUuid(data.assigned_to) ? new Date().toISOString() : null,
        assigned_by: isUuid(data.assigned_to) ? user.id : null,
      };

      const { data: request, error } = await supabase
        .from('department_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      // Upload attachments
      if (attachments.length > 0 && request) {
        await uploadAttachments(request.id);
      }

      // Send email notification for submitted request
      try {
        await supabase.functions.invoke('notify-department-request', {
          body: {
            requestId: request.id,
            action: 'submitted',
            userId: user.id
          }
        });
      } catch (emailError) {
        console.error('Failed to send submission notification:', emailError);
        // Don't fail the request creation if email fails
      }

      toast({
        title: 'Success',
        description: 'Request submitted successfully',
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error creating request:', error);
      
      // Log more details for debugging
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to create request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="flex-1">
          <CardTitle>{departmentLabel} Request</CardTitle>
          {selectedCompany && (
            <p className="text-sm text-muted-foreground mt-1">
              For {selectedCompany.name}
            </p>
          )}
        </div>
        {selectedCompany?.logo_url && (
          <div className="flex-shrink-0">
            <img 
              src={selectedCompany.logo_url} 
              alt={`${selectedCompany.name} logo`}
              className="h-12 w-12 object-contain"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of your request" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sub_department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subDepartments.map((subDept) => (
                          <SelectItem key={subDept} value={subDept}>
                            {subDept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <LocationSelect
                        companyId={selectedCompany?.id}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Provide detailed information about your request..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Leave unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {user.email && `(${user.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>Attachments (Optional)</FormLabel>
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
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>

        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-6 h-6" />
                <DialogTitle>Request Submitted Successfully!</DialogTitle>
              </div>
              <DialogDescription>
                Your {departmentLabel.toLowerCase()} request has been submitted and is now being processed.
                {attachments.length > 0 && ` ${attachments.length} attachment${attachments.length > 1 ? 's' : ''} uploaded successfully.`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/home');
                }}
                className="flex-1"
              >
                Back to Home
              </Button>
              <Button
                variant="premium"
                onClick={() => {
                  setShowSuccessModal(false);
                  form.reset();
                  setAttachments([]);
                }}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
