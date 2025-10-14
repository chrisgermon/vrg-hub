import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function MarketingCalendar() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Calendar</h1>
        <p className="text-muted-foreground">
          View and manage scheduled marketing requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Marketing calendar is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
