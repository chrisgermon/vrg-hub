import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface RequestCommentsProps {
  requestId: string;
  requestType: string;
}

export function RequestComments({ requestId, requestType }: RequestCommentsProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Request comments are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
