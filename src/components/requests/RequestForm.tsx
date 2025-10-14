import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, CheckCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CatalogQuickSelect } from './CatalogQuickSelect';
import { LocationSelect } from '@/components/ui/location-select';
import { useCompanyContext } from '@/contexts/CompanyContext';

const requestFormSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200, 'Item name must be less than 200 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  clinic_name: z.string().optional(),
  model_number: z.string().optional(),
  business_justification: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  status: z.enum(['draft', 'submitted']).default('draft'),
  company_id: z.string().optional(),
});

type FormData = z.infer<typeof requestFormSchema>;

interface RequestFormProps {
  onSuccess?: () => void;
  requestId?: string;
  defaultValues?: Partial<FormData>;
}

export function RequestForm({ onSuccess, requestId, defaultValues }: RequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  // Fetch companies for super admins
  React.useEffect(() => {
    if (userRole === 'super_admin') {
      fetchCompanies();
    }
  }, [userRole]);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('active', true)
      .order('name');
    
    if (data && !error) {
      setCompanies(data);
    }
  };

  const form = useForm<FormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      item_name: '',
      priority: 'medium',
      clinic_name: '',
      model_number: '',
      business_justification: '',
      quantity: 1,
      status: 'draft',
      company_id: selectedCompany?.id,
      ...defaultValues,
    },
  });

  // Ensure company_id defaults to the selected company once available
  React.useEffect(() => {
    const current = form.getValues('company_id');
    if (!current && selectedCompany?.id) {
      form.setValue('company_id', selectedCompany.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(event.dataTransfer.files);
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext || '');
    });
    
    if (validFiles.length !== files.length) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, DOC, JPG, and PNG files are allowed',
        variant: 'destructive',
      });
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (requestId: string) => {
    const uploadPromises = attachments.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save attachment record
      const { error: dbError } = await supabase
        .from('request_attachments')
        .insert({
          request_type: 'hardware',
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
      // Determine which company_id to use
      const targetCompanyId = userRole === 'super_admin' && data.company_id 
        ? data.company_id 
        : (selectedCompany?.id as string);

      // Create the request
      const requestData = {
        user_id: user.id,
        company_id: targetCompanyId,
        title: data.item_name,
        description: null,
        business_justification: data.business_justification,
        clinic_name: data.clinic_name,
        priority: data.priority,
        status: data.status,
        currency: 'AUD',
        expected_delivery_date: null,
        total_amount: 0,
      };

      const { data: request, error: requestError } = await supabase
        .from('hardware_requests')
        .insert(requestData)
        .select()
        .single();

      if (requestError) throw requestError;

      // Create single request item
      const itemData = {
        request_id: request.id,
        name: data.item_name,
        description: null,
        quantity: data.quantity,
        unit_price: 0,
        total_price: 0,
        vendor: null,
        model_number: data.model_number,
        catalog_item_id: null,
      };

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(itemData);

      if (itemsError) throw itemsError;

      // Upload attachments
      if (attachments.length > 0) {
        await uploadAttachments(request.id);
      }

      // Send email notification if request has "submitted" status
      if (data.status === 'submitted') {
        try {
          await supabase.functions.invoke('notify-request-update', {
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
      }

      toast({
        title: 'Success',
        description: 'Request created successfully',
      });

      // Show success modal instead of navigating
      setSubmittedRequestId(request.id);
      setShowSuccessModal(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create request',
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
          <CardTitle>{requestId ? 'Edit Request' : 'New Hardware Request'}</CardTitle>
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
            {/* Company selector for super admins */}
            {userRole === 'super_admin' && (
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Catalog Quick Select */}
            <div className="flex justify-end">
              <CatalogQuickSelect
                onSelect={(item) => {
                  form.setValue('item_name', item.name);
                  form.setValue('model_number', item.model_number || '');
                  toast({
                    title: 'Item selected',
                    description: `${item.name} has been added to your request`,
                  });
                }}
              />
            </div>

            {/* Main Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="item_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Scanner for Ultrasound" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="clinic_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <LocationSelect
                        companyId={form.watch('company_id') || selectedCompany?.id}
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
              name="model_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MK1E3LL/A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="business_justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why this hardware is needed..."
                        className="resize-none"
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Attachments */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Attachments (Optional)</h3>
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="text-center">
                    <Upload className={`mx-auto h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="mt-2">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="block text-xs font-medium">
                          {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          PDF, DOC, JPG, PNG
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  form.setValue('status', 'draft');
                  form.handleSubmit(onSubmit)();
                }}
                variant="ghost"
                size="lg"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  form.setValue('status', 'submitted');
                  form.handleSubmit(onSubmit)();
                }}
                variant="premium"
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <DialogTitle>Request Submitted Successfully!</DialogTitle>
                  <DialogDescription>
                    Your hardware request has been submitted for approval.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                Request ID: <span className="font-mono text-foreground">{submittedRequestId}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                You will receive email updates as your request progresses through the approval process.
              </div>
            </div>

            <div className="flex gap-3">
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
                  // Reset form for new request
                  form.reset({
                    item_name: '',
                    priority: 'medium',
                    clinic_name: '',
                    model_number: '',
                    business_justification: '',
                    quantity: 1,
                    status: 'draft',
                  });
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
