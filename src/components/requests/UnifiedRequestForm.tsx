import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandLocationSelect } from '@/components/ui/brand-location-select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UnifiedRequestFormProps {
  requestTypeId: string;
  requestTypeName: string;
  departmentId?: string;
}

interface FormData {
  title: string;
  description: string;
  priority: string;
  brand_id: string;
  location_id: string;
  metadata: Record<string, any>;
}

export function UnifiedRequestForm({ requestTypeId, requestTypeName, departmentId }: UnifiedRequestFormProps) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    priority: 'medium',
    brand_id: profile?.brand_id || '',
    location_id: profile?.location_id || '',
    metadata: {},
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        brand_id: profile.brand_id || '',
        location_id: profile.location_id || '',
      }));
    }
  }, [profile]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBrandLocationChange = (brandId: string, locationId: string) => {
    setFormData(prev => ({
      ...prev,
      brand_id: brandId,
      location_id: locationId,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          status: 'inbox',
          user_id: user.id,
          request_type_id: requestTypeId,
          department_id: departmentId || null,
          brand_id: formData.brand_id || null,
          location_id: formData.location_id || null,
          metadata: formData.metadata,
        })
        .select('request_number')
        .single();

      if (error) throw error;

      toast.success('Request submitted successfully');
      navigate(`/request/${data.request_number}`);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{requestTypeName} Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Brief description of your request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide detailed information about your request"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleChange('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BrandLocationSelect
            selectedBrandId={formData.brand_id}
            selectedLocationId={formData.location_id}
            onBrandChange={(brandId) => handleBrandLocationChange(brandId, formData.location_id)}
            onLocationChange={(locationId) => handleBrandLocationChange(formData.brand_id, locationId)}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/requests/new')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}