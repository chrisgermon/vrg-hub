import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function NewsViewAll() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company News</h1>
        <p className="text-muted-foreground">
          Stay up to date with the latest company announcements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company News</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Company news is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
