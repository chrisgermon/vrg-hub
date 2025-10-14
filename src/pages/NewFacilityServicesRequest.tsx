import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplatedDepartmentRequestForm } from '@/components/requests/TemplatedDepartmentRequestForm';

export default function NewFacilityServicesRequest() {
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
          <h1 className="text-3xl font-bold">Facility Services Request</h1>
          <p className="text-muted-foreground">Submit a facility services request</p>
        </div>
      </div>

      <TemplatedDepartmentRequestForm
        department="facility_services"
        departmentLabel="Facility Services"
      />
    </div>
  );
}
