import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TonerRequestForm } from '@/components/requests/TonerRequestForm';
import { PermissionGuard } from '@/components/PermissionGuard';

export default function NewTonerRequest() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/requests');
  };

  const handleBack = () => {
    navigate('/requests');
  };

  return (
    <PermissionGuard permission="create_toner_request">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Toner Request</h1>
            <p className="text-muted-foreground">Submit a toner order request</p>
          </div>
        </div>

        <TonerRequestForm />
      </div>
    </PermissionGuard>
  );
}