import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequestsList } from '@/components/requests/RequestsList';
import { RequestFilters } from '@/components/requests/RequestFilters';
import { useAuth } from '@/hooks/useAuth';

export default function Requests() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isManagerOrAdmin = ['manager', 'marketing_manager', 'tenant_admin', 'super_admin'].includes(userRole || '');

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Requests</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all hardware and equipment requests
          </p>
        </div>
        <Button onClick={() => navigate('/requests/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="pending">Pending Approval</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <RequestsList />
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-6">
          <RequestsList />
        </TabsContent>

        {isManagerOrAdmin && (
          <TabsContent value="pending" className="space-y-6">
            <RequestsList />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
