import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface EmailLogsProps {
  requestId?: string;
  marketingRequestId?: string;
  userAccountRequestId?: string;
}

export function EmailLogs({ requestId, marketingRequestId, userAccountRequestId }: EmailLogsProps) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Email logs are not available in single-tenant mode.
      </AlertDescription>
    </Alert>
  );
}
