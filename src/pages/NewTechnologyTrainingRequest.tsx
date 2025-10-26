import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplatedDepartmentRequestForm } from '@/components/requests/TemplatedDepartmentRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function NewTechnologyTrainingRequest() {
  const handleBack = () => {
    window.location.href = '/requests/new';
  };

  return (
    <PermissionGuard permission="create_technology_training_request">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4 mr-2" />
            Back to Request Types
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Technology Training Request</h1>
            <p className="text-muted-foreground">Submit a technology training request</p>
          </div>
        </div>

        <TemplatedDepartmentRequestForm
          department="technology_training"
          departmentLabel="Technology Training"
        />
      </div>
    </PermissionGuard>
  );
}
