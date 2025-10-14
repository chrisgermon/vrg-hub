import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormTemplate, FormField as FormFieldType } from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationSelect } from '@/components/ui/location-select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { FileDropzone, FileList } from '@/components/ui/file-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DynamicDepartmentRequestFormProps {
  template: FormTemplate;
  department: string;
  departmentLabel: string;
  onSuccess?: () => void;
}

function buildZodSchema(fields: FormFieldType[]) {
  const shape: Record<string, any> = {};

  fields.forEach((field) => {
    let validator: any;

    switch (field.type) {
      case 'email':
        validator = z.string().email('Invalid email address');
        break;
      case 'number':
        validator = z.coerce.number();
        if (field.validation?.min) validator = validator.min(field.validation.min);
        if (field.validation?.max) validator = validator.max(field.validation.max);
        break;
      case 'phone':
        validator = z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid phone number');
        break;
      case 'checkbox':
        validator = z.boolean();
        break;
      case 'multiselect':
        validator = z.array(z.string());
        break;
      default:
        validator = z.string();
        if (field.validation?.min) {
          validator = validator.min(field.validation.min, `Minimum ${field.validation.min} characters`);
        }
        if (field.validation?.max) {
          validator = validator.max(field.validation.max, `Maximum ${field.validation.max} characters`);
        }
    }

    if (field.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine((val: boolean) => val === true, {
          message: `${field.label} is required`,
        });
      } else if (field.type !== 'multiselect') {
        validator = validator.min(1, `${field.label} is required`);
      }
    } else {
      validator = validator.optional();
    }

    shape[field.id] = validator;
  });

  return z.object(shape);
}

export function DynamicDepartmentRequestForm({
  template,
  department,
  departmentLabel,
  onSuccess,
}: DynamicDepartmentRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedCompany } = useCompanyContext();
  const navigate = useNavigate();

  const schema = buildZodSchema(template.fields);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: template.fields.reduce((acc, field) => {
      acc[field.id] = field.defaultValue || (field.type === 'multiselect' ? [] : '');
      return acc;
    }, {} as Record<string, any>),
  });

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

  const onSubmit = async (data: Record<string, any>) => {
    if (!user || !selectedCompany) return;

    setIsSubmitting(true);

    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error('User profile not found');
      }

      // Extract key fields
      const titleField = template.fields.find(f => f.id === 'title' || f.label?.toLowerCase().includes('title'));
      const subDeptField = template.fields.find(f => 
        f.id === 'sub_department' || 
        f.label?.toLowerCase().includes('category') || 
        f.label?.toLowerCase().includes('type')
      );
      const descField = template.fields.find(f => f.id === 'description' || f.type === 'textarea');
      const priorityField = template.fields.find(f => f.id === 'priority');
      const locationField = template.fields.find(f => f.id === 'location' || f.type === 'location');

      const title = titleField ? String(data[titleField.id] || '') : 'Request';
      const subDepartment = subDeptField ? String(data[subDeptField.id] || '') : 'General';
      const priority = priorityField ? String(data[priorityField.id] || 'medium') : 'medium';
      
      // Build description from all other fields
      let description = descField ? String(data[descField.id] || '') : '';
      
      // Append all other field values to description
      template.fields.forEach(field => {
        if (field.id !== titleField?.id && field.id !== subDeptField?.id && 
            field.id !== descField?.id && field.id !== priorityField?.id && 
            field.id !== locationField?.id) {
          const value = data[field.id];
          if (value) {
            const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
            description += `\n\n${field.label}: ${displayValue}`;
          }
        }
      });

      // Resolve location
      let locationId: string | null = null;
      if (locationField && data[locationField.id]) {
        const { data: loc } = await supabase
          .from('company_locations')
          .select('id')
          .eq('company_id', userProfile.company_id)
          .eq('name', data[locationField.id])
          .maybeSingle();
        locationId = loc?.id ?? null;
      }

      const requestData = {
        user_id: user.id,
        company_id: userProfile.company_id,
        department,
        sub_department: subDepartment,
        location_id: locationId,
        title,
        description: description.trim(),
        priority,
        status: 'submitted',
      };

      const { data: request, error } = await supabase
        .from('department_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;

      if (attachments.length > 0 && request) {
        await uploadAttachments(request.id);
      }

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
      }

      toast({
        title: 'Success',
        description: 'Request submitted successfully',
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  const renderField = (field: FormFieldType) => {
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.id}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {(() => {
                switch (field.type) {
                  case 'textarea':
                    return (
                      <Textarea
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    );
                  case 'select':
                    return (
                      <Select onValueChange={formField.onChange} value={formField.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder || 'Select an option'} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  case 'radio':
                    return (
                      <RadioGroup onValueChange={formField.onChange} value={formField.value}>
                        {field.options?.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                            <label htmlFor={`${field.id}-${option.value}`}>{option.label}</label>
                          </div>
                        ))}
                      </RadioGroup>
                    );
                  case 'multiselect':
                    return (
                      <div className="space-y-2">
                        {field.options?.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(formField.value as string[] || []).includes(option.value)}
                              onCheckedChange={(checked) => {
                                const currentValues = (formField.value as string[]) || [];
                                if (checked) {
                                  formField.onChange([...currentValues, option.value]);
                                } else {
                                  formField.onChange(currentValues.filter(v => v !== option.value));
                                }
                              }}
                              id={`${field.id}-${option.value}`}
                            />
                            <label htmlFor={`${field.id}-${option.value}`}>{option.label}</label>
                          </div>
                        ))}
                      </div>
                    );
                  case 'checkbox':
                    return (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={formField.value}
                          onCheckedChange={formField.onChange}
                        />
                      </div>
                    );
                  case 'location':
                    return (
                      <LocationSelect
                        companyId={template.company_id}
                        value={formField.value}
                        onValueChange={formField.onChange}
                      />
                    );
                  default:
                    return (
                      <Input
                        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : field.type === 'phone' ? 'tel' : 'text'}
                        placeholder={field.placeholder}
                        {...formField}
                      />
                    );
                }
              })()}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
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
            {sortedFields.map(renderField)}

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

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
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
