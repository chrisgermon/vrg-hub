import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicDepartmentRequestForm } from '@/components/requests/DynamicDepartmentRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function NewITServiceDeskRequest() {
  const handleBack = () => {
    window.location.href = '/requests/new';
  };

  return (
    <PermissionGuard permission="create_it_service_desk_request">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Request Types
          </Button>
          <div>
            <h1 className="text-3xl font-bold">IT Service Desk Request</h1>
            <p className="text-muted-foreground">Submit an IT service desk request</p>
          </div>
        </div>

        <DynamicDepartmentRequestForm
          department="IT"
          departmentLabel="IT Service Desk"
        />
      </div>
    </PermissionGuard>
  );
}
