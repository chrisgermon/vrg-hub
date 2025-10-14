import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function CompanyDirectory() {
  return (
    <div className="container mx-auto p-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Company directory is not available in single-tenant mode.
        </AlertDescription>
      </Alert>
    </div>
  );
}
