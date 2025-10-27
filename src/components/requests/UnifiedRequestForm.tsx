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

interface UnifiedRequestFormProps {
  requestTypeId: string;
  requestTypeName: string;
  departmentId?: string;
  formTemplateId?: string;
}

export function UnifiedRequestForm({ requestTypeId, requestTypeName, departmentId, formTemplateId }: UnifiedRequestFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [brandId, setBrandId] = useState(profile?.brand_id || '');
  const [locationId, setLocationId] = useState(profile?.location_id || '');

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

      // Determine if approval is required
      const requiresApproval = formTemplate?.settings?.require_approval || false;
      
      // Get approver if needed
      let approverId = null;
      let initialStatus = 'inbox';
      let approvalStatus = 'none';

      if (requiresApproval) {
        const { data: approverData } = await supabase.rpc('get_request_approver', {
          p_brand_id: brandId || null,
          p_location_id: locationId || null,
          p_request_type_id: requestTypeId
        });
        
        approverId = approverData;
        initialStatus = 'pending_manager_approval';
        approvalStatus = 'pending';
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: title || 'Untitled Request',
          description: description || null,
          priority: priority || 'medium',
          status: initialStatus,
          approval_status: approvalStatus,
          approver_id: approverId,
          user_id: user.id,
          request_type_id: requestTypeId,
          department_id: departmentId || null,
          brand_id: brandId || null,
          location_id: locationId || null,
          metadata: customFields, // Store all custom fields in metadata
        })
        .select('id, request_number')
        .single();

      if (error) throw error;

      // Send approval email if needed
      if (requiresApproval && approverId) {
        await supabase.functions.invoke('send-approval-request', {
          body: {
            ticketId: data.id,
            requestNumber: data.request_number,
            approverId
          }
        });
      }

      toast.success('Request submitted successfully');
      navigate(`/request/${data.request_number}`);
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