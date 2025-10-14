import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DynamicDepartmentRequestFormProps {
  template: any;
  department: string;
  departmentLabel: string;
  onSuccess?: () => void;
}

export function DynamicDepartmentRequestForm({
  template,
  department,
  departmentLabel,
  onSuccess,
}: DynamicDepartmentRequestFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{departmentLabel} Request</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Dynamic department request forms are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
