import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DynamicDepartmentRequestForm } from '@/components/requests/DynamicDepartmentRequestForm';

export default function NewMarketingServiceRequest() {
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
          <h1 className="text-3xl font-bold">Marketing Service Request</h1>
          <p className="text-muted-foreground">Submit a marketing service request</p>
        </div>
      </div>

      <DynamicDepartmentRequestForm
        department="Marketing"
        departmentLabel="Marketing Services"
        subDepartment="Services"
      />
    </div>
  );
}
