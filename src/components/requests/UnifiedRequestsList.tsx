import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function UnifiedRequestsList() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Unified requests list is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
