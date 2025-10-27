import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Send } from "lucide-react";
import { MailchimpCampaignsTab } from "@/components/marketing/MailchimpCampaignsTab";
import { FaxCampaignsTab } from "@/components/marketing/FaxCampaignsTab";

const MarketingCampaigns = () => {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze your email and fax campaign performance
        </p>
      </div>

      <Tabs defaultValue="mailchimp" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="mailchimp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Campaigns
          </TabsTrigger>
          <TabsTrigger value="fax" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Fax Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mailchimp" className="mt-6">
          <MailchimpCampaignsTab />
        </TabsContent>

        <TabsContent value="fax" className="mt-6">
          <FaxCampaignsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingCampaigns;
