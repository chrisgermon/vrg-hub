import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RequestActivityProps {
  requestId: string;
  requestType: string;
}

export function RequestActivity({ requestId, requestType }: RequestActivityProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Request activity is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
