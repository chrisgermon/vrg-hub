import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { UnifiedRequestsList } from "@/components/requests/UnifiedRequestsList";
import { RequestDetail } from "@/components/requests/RequestDetail";
import { DepartmentRequestDetail } from "@/components/requests/DepartmentRequestDetail";
import { TonerRequestDetail } from "@/components/requests/TonerRequestDetail";
import { MarketingRequestDetail } from "@/components/marketing/MarketingRequestDetail";
import { UserAccountDetail } from "@/components/user-accounts/UserAccountDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type RequestType = 'hardware' | 'marketing' | 'user_account' | 'toner' | 'department';

export default function Requests() {
  const { profile } = useAuth();
  const [viewingRequest, setViewingRequest] = useState<{
    id: string;
    type: RequestType;
  } | null>(null);

  const handleView = (request: any) => {
    // Handle the unified request view
    if (request.type) {
      setViewingRequest({ id: request.id, type: request.type });
    }
  };

  const handleViewByType = (id: string, type: RequestType) => {
    setViewingRequest({ id, type });
  };

  const handleBack = () => {
    setViewingRequest(null);
  };

  if (viewingRequest) {
    return (
      <div className="container mx-auto py-3 md:py-6 px-3 md:px-6 space-y-4 md:space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-2 md:mb-4"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back to Requests</span>
          <span className="sm:hidden">Back</span>
        </Button>
        
        {viewingRequest.type === 'hardware' && (
          <RequestDetail requestId={viewingRequest.id} />
        )}
        {viewingRequest.type === 'department' && (
          <DepartmentRequestDetail requestId={viewingRequest.id} />
        )}
        {viewingRequest.type === 'toner' && (
          <TonerRequestDetail requestId={viewingRequest.id} />
        )}
        {viewingRequest.type === 'marketing' && (
          <MarketingRequestDetail requestId={viewingRequest.id} />
        )}
        {viewingRequest.type === 'user_account' && (
          <UserAccountDetail requestId={viewingRequest.id} />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-3 md:px-6 space-y-4 md:space-y-6">
      <div className="space-y-1 md:space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Requests</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View and manage your requests
        </p>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="my-requests" className="text-xs md:text-sm px-2 md:px-4">
            My Requests
          </TabsTrigger>
          <TabsTrigger value="manage-requests" className="text-xs md:text-sm px-2 md:px-4">
            Manage
          </TabsTrigger>
          <TabsTrigger value="inbox" className="text-xs md:text-sm px-2 md:px-4">
            Inbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>
                Requests you have created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedRequestsList 
                onView={handleView}
                onViewUserAccount={(req) => handleViewByType(req.id, 'user_account')}
                onViewMarketing={(req) => handleViewByType(req.id, 'marketing')}
                onViewToner={(req) => handleViewByType(req.id, 'toner')}
                onViewDepartment={(req) => handleViewByType(req.id, 'department')}
                filterMode="my-requests"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage Requests</CardTitle>
              <CardDescription>
                Requests assigned to your departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedRequestsList 
                onView={handleView}
                onViewUserAccount={(req) => handleViewByType(req.id, 'user_account')}
                onViewMarketing={(req) => handleViewByType(req.id, 'marketing')}
                onViewToner={(req) => handleViewByType(req.id, 'toner')}
                onViewDepartment={(req) => handleViewByType(req.id, 'department')}
                filterMode="assigned-to-me"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>
                AI-categorized requests from inbound emails needing review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedRequestsList 
                onView={handleView}
                onViewUserAccount={(req) => handleViewByType(req.id, 'user_account')}
                onViewMarketing={(req) => handleViewByType(req.id, 'marketing')}
                onViewToner={(req) => handleViewByType(req.id, 'toner')}
                onViewDepartment={(req) => handleViewByType(req.id, 'department')}
                filterMode="inbox"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
