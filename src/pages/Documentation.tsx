import { SharePointBrowser } from "@/components/documentation/SharePointBrowser";

export default function Documentation() {
  return (
    <div className="container-responsive py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Company Documents</h1>
          <p className="text-muted-foreground">
            Browse your company documents from SharePoint
          </p>
        </div>
      </div>

      <SharePointBrowser />
    </div>
  );
}
