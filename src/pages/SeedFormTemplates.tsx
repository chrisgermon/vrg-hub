import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SeedFormTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seed Form Templates</h1>
        <p className="text-muted-foreground">
          Initialize form templates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Form Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Form template seeding is not available in single-tenant mode.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
