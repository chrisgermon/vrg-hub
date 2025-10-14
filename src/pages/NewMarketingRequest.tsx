import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketingRequestForm } from '@/components/marketing/MarketingRequestForm';

export default function NewMarketingRequest() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/requests');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Marketing Request</h1>
        <p className="text-muted-foreground">
          Create a new fax blast, email blast, or website update request
        </p>
      </div>

      <MarketingRequestForm onSuccess={handleSuccess} />
    </div>
  );
}