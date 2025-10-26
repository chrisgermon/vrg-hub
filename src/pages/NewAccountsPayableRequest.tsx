import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicDepartmentRequestForm } from '@/components/requests/DynamicDepartmentRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function NewAccountsPayableRequest() {
  const handleBack = () => {
    window.location.href = '/requests/new';
  };

  return (
    <PermissionGuard permission="create_accounts_payable_request">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Request Types
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Accounts Payable Request</h1>
            <p className="text-muted-foreground">Submit an accounts payable request</p>
          </div>
        </div>

        <DynamicDepartmentRequestForm
          department="Accounts Payable"
          departmentLabel="Accounts Payable"
        />
      </div>
    </PermissionGuard>
  );
}
