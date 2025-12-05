import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FoxoFeedModuleProps {
  isAdmin?: boolean;
}

export function FoxoFeedModule({ isAdmin = false }: FoxoFeedModuleProps) {
  return (
    <Card className="h-full rounded-xl shadow-sm border border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-primary flex items-center gap-2">
          <Rss className="h-4 w-4" />
          LIVE FOXO FEED
        </CardTitle>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Rss className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            FOXO feed integration coming soon
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Live updates will appear here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
