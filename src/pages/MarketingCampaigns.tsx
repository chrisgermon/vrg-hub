import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, FileText, FileBarChart } from "lucide-react";
import { MailchimpCampaignsTab } from "@/components/marketing/MailchimpCampaignsTab";
import { NotifyreFaxCampaigns } from "@/components/notifyre/NotifyreFaxCampaigns";
import { CampaignReportGenerator } from "@/components/marketing/CampaignReportGenerator";

const MarketingCampaigns = () => {
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            View and analyze your email and fax campaign performance
          </p>
        </div>
        <Button onClick={() => setReportDialogOpen(true)}>
          <FileBarChart className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email Campaigns
          </TabsTrigger>
          <TabsTrigger value="fax" className="gap-2">
            <FileText className="h-4 w-4" />
            Fax Campaigns
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="email" className="mt-6">
          <MailchimpCampaignsTab />
        </TabsContent>
        
        <TabsContent value="fax" className="mt-6">
          <NotifyreFaxCampaigns />
        </TabsContent>
      </Tabs>

      <CampaignReportGenerator 
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
};

export default MarketingCampaigns;
