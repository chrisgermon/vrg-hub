import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplatedDepartmentRequestForm } from '@/components/requests/TemplatedDepartmentRequestForm';

export default function NewITServiceDeskRequest() {
  const handleBack = () => {
    window.location.href = '/requests/new';
  };

  return (
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

      <TemplatedDepartmentRequestForm
        department="it_service_desk"
        departmentLabel="IT Service Desk"
      />
    </div>
  );
}
