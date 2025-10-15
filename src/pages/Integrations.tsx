import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, RefreshCw, MessageSquare, FileText, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Integrations() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notifyreStatus, setNotifyreStatus] = useState<"connected" | "disconnected" | "testing">("disconnected");
  const [sharepointStatus, setSharepointStatus] = useState<"connected" | "disconnected">("disconnected");
  const [sharepointUrl, setSharepointUrl] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkNotifyreStatus();
    checkSharePointStatus();
    fetchLastSync();
  }, []);

  const checkSharePointStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has Office 365 connection
      const { data: connection } = await supabase
        .from('office365_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connection) {
        setSharepointStatus("connected");
        
        // Get SharePoint site URL
        const { data: config } = await supabase
          .from('sharepoint_configurations')
          .select('site_url')
          .eq('company_id', connection.company_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (config?.site_url) {
          setSharepointUrl(config.site_url);
        }
      } else {
        setSharepointStatus("disconnected");
      }
    } catch (error) {
      console.error('Error checking SharePoint status:', error);
      setSharepointStatus("disconnected");
    }
  };

  const checkNotifyreStatus = async () => {
    try {
      // Check if there are any fax campaigns
      const { data, error } = await supabase
        .from('notifyre_fax_campaigns')
        .select('id')
        .limit(1);

      if (!error && data && data.length > 0) {
        setNotifyreStatus("connected");
      } else {
        setNotifyreStatus("disconnected");
      }
    } catch (error) {
      console.error('Error checking Notifyre status:', error);
      setNotifyreStatus("disconnected");
    }
  };

  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from('notifyre_sync_history')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setLastSync(new Date(data.created_at).toLocaleString());
      }
    } catch (error) {
      console.error('Error fetching last sync:', error);
    }
  };

  const testNotifyreConnection = async () => {
    setTesting(true);
    setNotifyreStatus("testing");

    try {
      // Test by calling the sync function with a small date range
      const { error } = await supabase.functions.invoke('sync-notifyre-fax-logs', {
        body: {
          from_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to_date: new Date().toISOString(),
          force_full_sync: false
        }
      });

      if (error) {
        throw error;
      }

      setNotifyreStatus("connected");
      toast({
        title: "Success",
        description: "Notifyre connection test successful",
      });
      
      await checkNotifyreStatus();
      await fetchLastSync();
    } catch (error: any) {
      console.error('Error testing Notifyre connection:', error);
      setNotifyreStatus("disconnected");
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Notifyre API",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    setSendingSms(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms-reminder', {
        body: {
          phoneNumber: testPhone,
          message: testMessage,
          reminderId: 'test-sms'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test SMS sent successfully",
      });
      
      setTestPhone("");
      setTestMessage("");
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Failed to Send SMS",
        description: error.message || "Failed to send test SMS via Notifyre",
        variant: "destructive",
      });
    } finally {
      setSendingSms(false);
    }
  };

  const getStatusBadge = () => {
    switch (notifyreStatus) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "testing":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Testing...
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          Manage third-party integrations and API keys
        </p>
      </div>

      <Alert>
        <AlertDescription>
          API keys are stored securely as backend secrets. To update an API key, you'll need to use the backend secrets manager.
        </AlertDescription>
      </Alert>

      {/* Notifyre Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Notifyre Fax API
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Integrate with Notifyre for fax campaign management
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkNotifyreStatus();
                fetchLastSync();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastSync && (
            <div className="text-sm text-muted-foreground">
              Last synced: {lastSync}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>API Key Configuration</Label>
              <p className="text-sm text-muted-foreground mt-1">
                API key is stored securely in backend secrets
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  toast({
                    title: "Update API Key",
                    description: "Please use the Lovable backend secrets manager to update NOTIFYRE_API_KEY.",
                  });
                }}
              >
                Update API Key
              </Button>
              <Button
                onClick={testNotifyreConnection}
                disabled={testing}
              >
                {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Connection
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Test SMS
            </h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Phone Number</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-message">Message</Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your test message"
                  rows={3}
                />
              </div>
              <Button
                onClick={sendTestSms}
                disabled={sendingSms || !testPhone.trim() || !testMessage.trim()}
                className="w-full"
              >
                {sendingSms && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Test SMS
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Integration Details</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Provider:</span>
                <span className="font-medium text-foreground">Notifyre</span>
              </div>
              <div className="flex justify-between">
                <span>API Version:</span>
                <span className="font-medium text-foreground">v1</span>
              </div>
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="font-medium text-foreground">api.notifyre.com</span>
              </div>
              <div className="flex justify-between">
                <span>Features:</span>
                <span className="font-medium text-foreground">Fax Campaigns, SMS, Logs</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" asChild>
              <a href="/fax-campaigns" target="_blank" rel="noopener noreferrer">
                View Fax Campaigns
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SharePoint Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                SharePoint
                {sharepointStatus === "connected" ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    Auto-connects on login
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Access your company-wide SharePoint documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkSharePointStatus}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>Connection Status</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {sharepointStatus === "connected" 
                  ? "Your Office 365 account is connected and you have access to SharePoint."
                  : "SharePoint will automatically connect when you log in via Azure AD."}
              </p>
            </div>

            {sharepointUrl && (
              <div>
                <Label>Company SharePoint Site</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={sharepointUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={sharepointUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Integration Details</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-medium text-foreground">Microsoft SharePoint</span>
                </div>
                <div className="flex justify-between">
                  <span>Authentication:</span>
                  <span className="font-medium text-foreground">Azure AD OAuth</span>
                </div>
                <div className="flex justify-between">
                  <span>Features:</span>
                  <span className="font-medium text-foreground">Document Access, Search</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" asChild>
                <a href="/documentation">
                  Browse SharePoint Documents
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future integrations */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Additional Integrations</CardTitle>
          <CardDescription>
            More integrations can be added here in the future
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Contact support to request new integrations or suggest third-party services you'd like to connect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
