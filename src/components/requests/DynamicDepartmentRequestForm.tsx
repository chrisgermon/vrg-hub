import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface FormTemplate {
  id: string;
  name: string;
  department: string;
  sub_department?: string;
  fields: Field[];
  description?: string;
}

interface DynamicDepartmentRequestFormProps {
  department: string;
  departmentLabel: string;
  subDepartment?: string;
}

export function DynamicDepartmentRequestForm({
  department,
  departmentLabel,
  subDepartment,
}: DynamicDepartmentRequestFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const { user, profile } = useAuth();
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');
  const navigate = useNavigate();

  // Update when profile loads
  useEffect(() => {
    if (profile?.brand_id && !brandId) {
      setBrandId(profile.brand_id);
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  useEffect(() => {
    loadTemplate();
  }, [department, subDepartment]);

  const loadTemplate = async () => {
    try {
      let query = supabase
        .from('form_templates')
        .select('*')
        .eq('department', department)
        .eq('is_active', true);

      if (subDepartment) {
        query = query.eq('sub_department', subDepartment);
      }

      const { data, error} = await query.single();

      if (error) throw error;

      // Cast fields from Json to Field[]
      const templateData: FormTemplate = {
        ...data,
        fields: data.fields as unknown as Field[],
      };

      setTemplate(templateData);
    } catch (error) {
      console.error('Error loading form template:', error);
      toast.error('Failed to load form template');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!template) {
      toast.error('Form template not loaded');
      return;
    }

    // Validate required fields
    const missingFields = template.fields
      .filter(field => field.required && !formData[field.id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      // Create a title from the form data
      const titleField = template.fields.find(f => 
        f.id.includes('title') || 
        f.id.includes('name') || 
        f.id === 'request_type' ||
        f.id === 'service_type' ||
        f.id === 'request_category'
      );
      
      const title = titleField 
        ? `${departmentLabel}: ${formData[titleField.id]}`
        : `${departmentLabel} Request`;

      // Combine all form data into description
      const descriptionParts = template.fields
        .filter(field => formData[field.id])
        .map(field => `${field.label}: ${formData[field.id]}`);

      const { data: request, error } = await supabase
        .from('hardware_requests')
        .insert({
          title,
          description: descriptionParts.join('\n'),
          business_justification: JSON.stringify({
            department,
            sub_department: subDepartment,
            form_data: formData,
          }),
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          status: 'submitted',
          priority: formData.priority || formData.urgency || 'medium',
          currency: 'AUD',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Your request has been submitted successfully');
      navigate(`/requests/${request.id}`);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: Field) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Textarea
              id={field.id}
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              required={field.required}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Select
              value={formData[field.id] || ''}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              required={field.required}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={formData[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Form template not found. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <BrandLocationSelect
            selectedBrandId={brandId}
            selectedLocationId={locationId}
            onBrandChange={setBrandId}
            onLocationChange={setLocationId}
            required
          />

          {template.fields.map(renderField)}

          <div className="flex gap-4 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
