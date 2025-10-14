import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function UnifiedUserManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unified User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Multi-company user management is not available in single-tenant mode. 
            Please use the User Role Manager for managing users.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
