import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Mail, Loader2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CampaignReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimeframeOption = 'this_week' | 'last_week' | 'this_month' | 'last_month';

export const CampaignReportGenerator = ({ open, onOpenChange }: CampaignReportGeneratorProps) => {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("this_week");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch recent recipient emails for the logged-in user
  const { data: recentEmails, refetch } = useQuery({
    queryKey: ['recent-campaign-recipients'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('campaign_report_recipients')
        .select('email, last_used_at')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent emails:', error);
        return [];
      }

      return data || [];
    },
    enabled: open,
  });

  const saveRecentEmail = async (email: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('campaign_report_recipients')
      .upsert(
        {
          user_id: user.id,
          email,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,email',
        }
      );
  };

  const handleGenerateReport = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    if (!recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-report', {
        body: {
          recipientEmail,
          timeframe
        }
      });

      if (error) throw error;

      if (data?.success) {
        await saveRecentEmail(recipientEmail);
        await refetch();
        toast.success("Campaign report sent successfully!");
        setRecipientEmail("");
        setTimeframe("this_week");
        onOpenChange(false);
      } else {
        toast.error(data?.message || "Failed to generate report");
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Failed to generate and send report");
    } finally {
      setIsGenerating(false);
    }
  };

  const getTimeframeLabel = (value: TimeframeOption) => {
    const labels: Record<TimeframeOption, string> = {
      this_week: "This Week",
      last_week: "Last Week",
      this_month: "This Month",
      last_month: "Last Month"
    };
    return labels[value];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Campaign Report
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive report of email and fax campaigns for the selected timeframe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
              <SelectTrigger id="timeframe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
            {recentEmails && recentEmails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent recipients
                </Label>
                <div className="flex flex-wrap gap-2">
                  {recentEmails.map((item) => (
                    <Badge
                      key={item.email}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setRecipientEmail(item.email)}
                    >
                      {item.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
