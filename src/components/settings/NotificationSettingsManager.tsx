import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function NotificationSettingsManager() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Notification settings manager is not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
