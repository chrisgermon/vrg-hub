import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TonerRequestDetailProps {
  requestId: string;
}

export function TonerRequestDetail({ requestId }: TonerRequestDetailProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Toner request details are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
