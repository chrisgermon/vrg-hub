import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { LocationSelect } from '@/components/ui/location-select';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';

const tonerRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  site: z.string().min(1, 'Site/location is required'),
  printer_model: z.string().min(1, 'Printer model is required'),
  colors_required: z.array(z.string()).min(1, 'At least one color is required'),
  urgency: z.enum(['normal', 'urgent', 'critical']),
});

type FormData = z.infer<typeof tonerRequestSchema>;

interface TonerRequestFormProps {
  onSuccess?: () => void;
}

export function TonerRequestForm({ onSuccess }: TonerRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recentPrinterModels, setRecentPrinterModels] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();

  const form = useForm<FormData>({
    resolver: zodResolver(tonerRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      quantity: 1,
      site: '',
      printer_model: '',
      colors_required: [],
      urgency: 'normal',
    },
  });

  useEffect(() => {
    const fetchRecentPrinterModels = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('toner_requests')
        .select('printer_model')
        .eq('user_id', user.id)
        .not('printer_model', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const uniqueModels = [...new Set(data.map(r => r.printer_model).filter(Boolean))];
        setRecentPrinterModels(uniqueModels.slice(0, 5));
      }
    };

    fetchRecentPrinterModels();
  }, [user]);

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
          request_type: 'toner',
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
      // Create toner request
      const { data: request, error: requestError } = await supabase
        .from('toner_requests')
        .insert({
          user_id: user.id,
          company_id: selectedCompany.id,
          title: data.title,
          description: data.description,
          quantity: data.quantity,
          site: data.site,
          printer_model: data.printer_model,
          colors_required: data.colors_required,
          urgency: data.urgency,
          status: 'submitted',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Upload attachments
      if (attachments.length > 0) {
        await uploadAttachments(request.id);
      }

      // Send email notification
      try {
        await supabase.functions.invoke('send-toner-request-email', {
          body: {
            requestId: request.id,
            userId: user.id,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request creation if email fails
      }

      toast({
        title: 'Success',
        description: 'Toner request submitted successfully',
      });

      setShowSuccessModal(true);
      form.reset();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating toner request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create toner request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New Toner Request</CardTitle>
          {selectedCompany && (
            <p className="text-sm text-muted-foreground">
              For {selectedCompany.name} - Request will be sent to orders@crowdit.com.au
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Black Toner for HP LaserJet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <LocationSelect
                          companyId={selectedCompany?.id}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Search locations..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="printer_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Printer Model *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input placeholder="e.g., HP LaserJet Pro M404dn" {...field} />
                          {recentPrinterModels.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs text-muted-foreground">Recently used:</span>
                              {recentPrinterModels.map((model) => (
                                <Badge
                                  key={model}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-accent"
                                  onClick={() => field.onChange(model)}
                                >
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colors_required"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colors Required *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {['Black', 'Cyan', 'Magenta', 'Yellow'].map((color) => (
                            <div key={color} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={color}
                                checked={field.value?.includes(color)}
                                onChange={(e) => {
                                  const value = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...value, color]);
                                  } else {
                                    field.onChange(value.filter((v) => v !== color));
                                  }
                                }}
                                className="rounded border-input"
                              />
                              <label htmlFor={color} className="text-sm">{color}</label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information about the toner request..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />

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

            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <DialogTitle>Request Submitted Successfully!</DialogTitle>
            </div>
            <DialogDescription className="space-y-2">
              <p>Your toner request has been submitted and sent to orders@crowdit.com.au</p>
              <p className="text-sm">You will be notified once the order is processed.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowSuccessModal(false);
              if (onSuccess) onSuccess();
            }}>
              Create Another Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}