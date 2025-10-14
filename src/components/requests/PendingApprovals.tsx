import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface PendingApprovalsProps {
  refreshTrigger?: number;
}

export function PendingApprovals({ refreshTrigger }: PendingApprovalsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pending approvals are not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}