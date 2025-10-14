import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function CannedResponsesManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Canned responses manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
