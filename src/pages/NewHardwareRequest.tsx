import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequestForm } from '@/components/requests/RequestForm';

export default function NewHardwareRequest() {
  const handleSuccess = () => {
    window.location.href = '/requests';
  };

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
          <h1 className="text-3xl font-bold">New Hardware Request</h1>
          <p className="text-muted-foreground">Create a new hardware request for approval</p>
        </div>
      </div>

      <RequestForm onSuccess={handleSuccess} />
    </div>
  );
}