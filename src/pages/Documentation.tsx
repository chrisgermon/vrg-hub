import { SharePointBrowser } from "@/components/documentation/SharePointBrowser";

export default function Documentation() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Documentation</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Browse your company documents from SharePoint
          </p>
        </div>

        <SharePointBrowser />
      </div>
    </div>
  );
}
