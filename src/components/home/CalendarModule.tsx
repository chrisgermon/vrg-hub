import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarModuleProps {
  isAdmin?: boolean;
}

export function CalendarModule({ isAdmin = false }: CalendarModuleProps) {
  return (
    <Card className="h-full rounded-xl shadow-sm border border-primary/20">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Calendar of Events
        </CardTitle>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Calendar integration coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
