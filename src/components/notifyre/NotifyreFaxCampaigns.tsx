import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const NotifyreFaxCampaigns = () => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Notifyre Fax Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifyre fax campaigns are not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
