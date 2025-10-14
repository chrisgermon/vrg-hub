import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface NewsFeedModuleProps {
  title?: string;
  maxItems?: number;
}

export function NewsFeedModule({ 
  title = "Latest News", 
  maxItems = 4
}: NewsFeedModuleProps) {
  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 h-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            News feed is not available in single-tenant mode.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}