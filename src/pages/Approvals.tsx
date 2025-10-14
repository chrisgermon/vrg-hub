import React from 'react';
import { PendingApprovals } from '@/components/requests/PendingApprovals';

export default function Approvals() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve hardware requests from your team
        </p>
      </div>

      <PendingApprovals />
    </div>
  );
}