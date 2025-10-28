import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { DynamicFormRenderer } from '@/components/form-builder/DynamicFormRenderer';
import { FormTemplate } from '@/types/form-builder';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CCEmailsInput } from './CCEmailsInput';

interface UnifiedRequestFormProps {
  requestTypeId: string;
  requestTypeName: string;
  departmentId?: string;
  formTemplateId?: string;
  categoryId?: string;
  categoryName?: string;
  assignedTo?: string;
}

export function UnifiedRequestForm({ 
  requestTypeId, 
  requestTypeName, 
  departmentId, 
  formTemplateId,
  categoryId,
  categoryName,
  assignedTo 
}: UnifiedRequestFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');
  const [ccEmails, setCcEmails] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setBrandId(profile.brand_id || '');
      setLocationId(profile.location_id || '');
    }
  }, [profile]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!formTemplateId) {
        setLoadingTemplate(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .eq('id', formTemplateId)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        
        // Parse JSON fields if they're coming as strings
        const parsedData: FormTemplate = {
          ...data,
          fields: Array.isArray(data.fields) ? data.fields : JSON.parse(data.fields as string),
          settings: data.settings && typeof data.settings === 'string' 
            ? JSON.parse(data.settings) 
            : (data.settings || undefined),
        };
        
        setFormTemplate(parsedData);
      } catch (error) {
        console.error('Error fetching form template:', error);
      } finally {
        setLoadingTemplate(false);
      }
    };

    fetchTemplate();
  }, [formTemplateId]);

  const handleSubmit = async (formData: any) => {
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    setLoading(true);

    try {
      // Extract standard fields
      const { title, description, priority, ...customFields } = formData;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: title || `${requestTypeName}${categoryName ? `: ${categoryName}` : ''}`,
          description: description || '',
          business_justification: JSON.stringify({
            department: requestTypeName,
            form_data: customFields,
          }),
          priority: priority || 'medium',
          status: 'inbox',
          user_id: user.id,
          brand_id: brandId || null,
          location_id: locationId || null,
          assigned_to: assignedTo || null,
          category_id: categoryId || null,
          form_template_id: formTemplateId || null,
          request_type_id: requestTypeId || null,
          metadata: customFields,
          cc_emails: ccEmails,
          source: 'form',
        })
        .select('id, request_number')
        .single();

      if (error) throw error;

      toast.success(`Request #${data.request_number} submitted successfully!`);
      navigate('/requests');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTemplate) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{requestTypeName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brand and Location Selection */}
          <div className="pb-6 border-b">
            <h3 className="text-sm font-medium mb-4">Location Information</h3>
            <BrandLocationSelect
              selectedBrandId={brandId}
              selectedLocationId={locationId}
              onBrandChange={setBrandId}
              onLocationChange={setLocationId}
            />
          </div>

          {/* CC Emails */}
          <div className="pb-6 border-b">
            <CCEmailsInput
              emails={ccEmails}
              onChange={setCcEmails}
              disabled={loading}
            />
          </div>

          {/* Custom Form Fields */}
          {formTemplate ? (
            <DynamicFormRenderer
              template={formTemplate}
              onSubmit={handleSubmit}
              isSubmitting={loading}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No custom form configured for this request type.
            </div>
          )}

          {/* Cancel button outside the form */}
          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests/new')}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}