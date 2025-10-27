import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedRequestForm } from '@/components/requests/UnifiedRequestForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RequestType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  department_id: string;
  form_template_id: string | null;
}

export default function NewDynamicRequest() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequestType = async () => {
      if (!slug) {
        setError('Invalid request type');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('request_types')
          .select('id, name, slug, description, department_id, form_template_id')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Request type not found or inactive');
        } else {
          setRequestType(data);
        }
      } catch (err: any) {
        console.error('Error fetching request type:', err);
        setError(err.message || 'Failed to load request type');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestType();
  }, [slug]);

  const handleBack = () => {
    navigate('/requests/new');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !requestType) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Request Types
        </Button>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Request type not found'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Request Types
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{requestType.name}</h1>
          {requestType.description && (
            <p className="text-muted-foreground mt-2">{requestType.description}</p>
          )}
        </div>
      </div>

      <UnifiedRequestForm
        requestTypeId={requestType.id}
        requestTypeName={requestType.name}
        departmentId={requestType.department_id}
        formTemplateId={requestType.form_template_id || undefined}
      />
    </div>
  );
}