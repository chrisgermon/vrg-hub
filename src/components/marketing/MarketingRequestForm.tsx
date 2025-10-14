import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Send, Repeat, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { format } from 'date-fns';
import { formatAUDateLong } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { LocationSelect } from '@/components/ui/location-select';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

const marketingRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  request_type: z.enum(['fax_blast', 'email_blast', 'website_update']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  brand: z.string().optional(),
  clinic: z.string().optional(),
  
  // Website update details
  website_update_details: z.string().optional(),
  
  // Scheduling
  scheduled_send_date: z.string().optional(),
  scheduled_send_time: z.string().optional(),
  
  // Recurring options
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  recurrence_end_date: z.string().optional(),
});

type FormData = z.infer<typeof marketingRequestSchema>;

interface MarketingRequestFormProps {
  onSuccess?: () => void;
}

export function MarketingRequestForm({ onSuccess }: MarketingRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipientListFile, setRecipientListFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [customBrand, setCustomBrand] = useState('');
  const [customClinic, setCustomClinic] = useState('');
  const { toast } = useToast();
  const { user, company } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const activeCompany = selectedCompany || company;

  // Fetch recent brands and clinics for quick select (user-specific)
  const { data: recentEntries } = useQuery({
    queryKey: ['recent-marketing-entries', user?.id],
    queryFn: async () => {
      if (!user?.id) return { brands: [], clinics: [] };
      
      const { data, error } = await supabase
        .from('marketing_requests')
        .select('brand, clinic')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Get unique brands and clinics
      const brands = [...new Set(data?.map(r => r.brand).filter(Boolean) as string[])].slice(0, 5);
      const clinics = [...new Set(data?.map(r => r.clinic).filter(Boolean) as string[])].slice(0, 5);
      
      return { brands, clinics };
    },
    enabled: !!user?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(marketingRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      request_type: 'email_blast',
      priority: 'medium',
      brand: '',
      clinic: '',
      website_update_details: '',
      scheduled_send_date: '',
      scheduled_send_time: '',
      is_recurring: false,
    },
  });

  const requestType = form.watch('request_type');
  const isRecurring = form.watch('is_recurring');

  const handleRecipientListUpload = (files: File[]) => {
    const file = files[0];
    if (file) {
      // Validate file type (CSV or TXT)
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV or TXT file',
          variant: 'destructive',
        });
        return;
      }
      setRecipientListFile(file);
    }
  };

  const handleDocumentUpload = (files: File[]) => {
    setDocumentFiles(prev => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, type: 'recipient_list' | 'document') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('marketing-requests')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !activeCompany) return;

    // Validation based on request type
    if ((data.request_type === 'fax_blast' || data.request_type === 'email_blast') && 
        !recipientListFile) {
      toast({
        title: 'Error',
        description: 'Please upload a recipient list file',
        variant: 'destructive',
      });
      return;
    }

    if (data.request_type === 'website_update' && !data.website_update_details?.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide website update details',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload recipient list file if provided
      let recipientListPath = null;
      if (recipientListFile) {
        recipientListPath = await uploadFile(recipientListFile, 'recipient_list');
      }

      // Upload document files
      const documentPaths: string[] = [];
      for (const file of documentFiles) {
        const path = await uploadFile(file, 'document');
        documentPaths.push(path);
      }

      // Create the marketing request
      const requestData: any = {
        user_id: user.id,
        company_id: activeCompany.id,
        title: data.title,
        description: data.description,
        request_type: data.request_type,
        business_justification: null,
        priority: data.priority,
        brand: data.brand || null,
        clinic: data.clinic || null,
        recipient_list_file_path: recipientListPath,
        document_file_paths: documentPaths.length > 0 ? documentPaths : null,
        document_urls: null,
        website_update_details: data.website_update_details,
        scheduled_send_date: data.scheduled_send_date ? new Date(data.scheduled_send_date + 'T' + (data.scheduled_send_time || '09:00')).toISOString() : null,
        scheduled_send_time: data.scheduled_send_time || null,
        is_recurring: data.is_recurring,
        recurrence_frequency: data.is_recurring ? data.recurrence_frequency : null,
        recurrence_end_date: data.is_recurring && data.recurrence_end_date ? data.recurrence_end_date : null,
        status: 'submitted' as const,
      };

      const { data: request, error: requestError } = await supabase
        .from('marketing_requests')
        .insert(requestData)
        .select()
        .single();

      if (requestError) throw requestError;

      // Create attachment records
      if (recipientListFile && recipientListPath) {
        await supabase
          .from('marketing_request_attachments')
          .insert({
            request_id: request.id,
            file_name: recipientListFile.name,
            file_path: recipientListPath,
            file_size: recipientListFile.size,
            content_type: recipientListFile.type,
            attachment_type: 'recipient_list',
            uploaded_by: user.id,
          });
      }

      for (let i = 0; i < documentFiles.length; i++) {
        const file = documentFiles[i];
        await supabase
          .from('marketing_request_attachments')
          .insert({
            request_id: request.id,
            file_name: file.name,
            file_path: documentPaths[i],
            file_size: file.size,
            content_type: file.type,
            attachment_type: 'document',
            uploaded_by: user.id,
          });
      }

      // Fax blast request is now handled like email blast - submitted for manual processing
      if (data.request_type === 'fax_blast') {
        console.log('Fax blast request created successfully:', {
          requestId: request.id,
          title: data.title,
          recipientListPath,
          documentPaths,
        });
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      // Get notification recipients from user notifications
      const { data: userNotifications } = await supabase
        .from('request_type_notifications')
        .select(`
          user_id,
          profiles!inner(email, name)
        `)
        .eq('company_id', activeCompany.id)
        .eq('request_type', 'marketing')
        .eq('receive_notifications', true);

      // Send email notifications to configured users
      if (userNotifications && userNotifications.length > 0) {
        for (const notification of userNotifications) {
          const email = (notification.profiles as any)?.email;
          if (email) {
            await supabase.functions.invoke('send-notification-email', {
              body: {
                to: email,
                subject: `New Marketing Request: ${data.title}`,
                template: 'marketing_request_submitted',
                data: {
                  requestTitle: data.title,
                  requestId: request.id,
                  requestUrl: `https://znpjdrmvjfmneotdhwdo.supabase.co/requests/marketing/${request.id}`,
                  requesterName: profile?.name || user.email || 'Unknown',
                  requestType: data.request_type,
                  priority: data.priority,
                  brand: data.brand,
                  clinic: data.clinic,
                  description: data.description,
                  scheduledSendDate: data.scheduled_send_date ? new Date(data.scheduled_send_date + 'T' + (data.scheduled_send_time || '09:00')).toLocaleDateString() : null,
                },
              },
            });
          }
        }

        // Log email notification
        await supabase
          .from('email_logs')
          .insert({
            marketing_request_id: request.id,
            request_type: 'marketing',
            email_type: 'marketing_request_submitted',
            recipient_email: userNotifications.map((n: any) => n.profiles?.email).filter(Boolean).join(', '),
            subject: `New Marketing Request: ${data.title}`,
            status: 'sent',
          });
      }

      toast({
        title: 'Success',
        description: 'Marketing request created successfully',
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating marketing request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create marketing request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Marketing Request</CardTitle>
        {activeCompany && (
          <p className="text-sm text-muted-foreground mt-1">
            For {activeCompany.name}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Newsletter Blast" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="request_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fax_blast">Fax Blast</SelectItem>
                        <SelectItem value="email_blast">Email Blast</SelectItem>
                        <SelectItem value="website_update">Website Update</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand (Optional)</FormLabel>
                    {recentEntries?.brands && recentEntries.brands.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {recentEntries.brands.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => {
                              form.setValue('brand', brand);
                              setCustomBrand('');
                            }}
                            className={cn(
                              "px-3 py-1 text-sm rounded-full border transition-colors",
                              field.value === brand
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary hover:bg-secondary/80 border-border"
                            )}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    )}
                    <FormControl>
                      <Input
                        placeholder="Enter brand name or select from recent"
                        {...field}
                        value={customBrand || field.value}
                        onChange={(e) => {
                          setCustomBrand(e.target.value);
                          field.onChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clinic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <LocationSelect
                        companyId={activeCompany?.id}
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
                    <SelectContent className="bg-background">
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about your request..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fax/Email Blast specific fields */}
            {(requestType === 'fax_blast' || requestType === 'email_blast') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <FileDropzone
                    label="Recipient List File *"
                    description="CSV or TXT file with fax numbers/emails"
                    accept=".csv,.txt"
                    onFilesSelected={handleRecipientListUpload}
                    multiple={false}
                  />
                  {recipientListFile && (
                    <FileList
                      files={[recipientListFile]}
                      onRemove={() => setRecipientListFile(null)}
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <FileDropzone
                    label="Documents to Send"
                    description="PDFs, images, or other documents"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    onFilesSelected={handleDocumentUpload}
                    multiple={true}
                  />
                  {documentFiles.length > 0 && (
                    <FileList
                      files={documentFiles}
                      onRemove={removeDocument}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Website Update specific fields */}
            {requestType === 'website_update' && (
              <FormField
                control={form.control}
                name="website_update_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website Update Details *</FormLabel>
                    <FormDescription>
                      Describe the changes needed, include URLs, content, and any specific requirements
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        placeholder="Please update the homepage banner with...&#10;Add new blog post about...&#10;Update contact information to..."
                        className="resize-none"
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Scheduling - Hidden for website updates */}
            {requestType !== 'website_update' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4" />
                  <h3 className="text-sm font-medium">Scheduling</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="scheduled_send_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Send Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  formatAUDateLong(field.value)
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduled_send_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2">
                          <Repeat className="w-4 h-4" />
                          Recurring Send
                        </FormLabel>
                        <FormDescription>
                          Enable to schedule this request to be sent repeatedly
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="recurrence_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How often the request should be sent
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurrence_end_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    formatAUDateLong(field.value)
                                  ) : (
                                    <span>Pick end date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            When to stop the recurring sends
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}