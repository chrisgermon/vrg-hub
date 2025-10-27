import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { MailchimpCampaignsTab } from "@/components/marketing/MailchimpCampaignsTab";

const MarketingCampaigns = () => {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
        <p className="text-muted-foreground mt-2">
          View and analyze your email campaign performance
        </p>
      </div>

      <MailchimpCampaignsTab />
    </div>
  );
};

export default MarketingCampaigns;
