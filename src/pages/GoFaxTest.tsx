import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Send, DollarSign, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GoFaxTest() {
  const [loading, setLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [faxDetails, setFaxDetails] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Send fax form state
  const [faxNumber, setFaxNumber] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [subject, setSubject] = useState("");

  const fetchCreditBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gofax-credit-balance');
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setCreditBalance(data.result);
      toast.success(`Credit Balance: $${data.result}`);
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      toast.error("Failed to fetch credit balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchFaxDetails = async (page = 1) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gofax-get-details', {
        body: { page, pageSize: 50 }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setFaxDetails(data.records || []);
      setTotalRecords(data.totalRecords || 0);
      setCurrentPage(page);
      toast.success(`Loaded ${data.records?.length || 0} fax records`);
    } catch (error) {
      console.error('Error fetching fax details:', error);
      toast.error("Failed to fetch fax details");
    } finally {
      setLoading(false);
    }
  };

  const sendFax = async () => {
    if (!faxNumber || !documentUrl) {
      toast.error("Fax number and document URL are required");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gofax-send-fax', {
        body: {
          faxNumber,
          documentUrl,
          fileName,
          subject
        }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Fax sent successfully!");
      // Clear form
      setFaxNumber("");
      setDocumentUrl("");
      setFileName("");
      setSubject("");
    } catch (error) {
      console.error('Error sending fax:', error);
      toast.error("Failed to send fax");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive", label: string }> = {
      'Sent': { variant: 'default', label: 'Sent' },
      'Pending': { variant: 'secondary', label: 'Pending' },
      'Failed': { variant: 'destructive', label: 'Failed' },
    };
    
    const config = statusMap[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GoFax API Test</h1>
        <p className="text-muted-foreground mt-2">
          Test GoFax API integration for sending faxes and viewing campaign details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Account Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={fetchCreditBalance} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Fetch Balance</span>
            </Button>
            {creditBalance !== null && (
              <div className="text-2xl font-bold">${creditBalance.toFixed(2)}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Send Fax
          </TabsTrigger>
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            Fax Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Fax</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="faxNumber">Fax Number *</Label>
                  <Input
                    id="faxNumber"
                    placeholder="+61291234567"
                    value={faxNumber}
                    onChange={(e) => setFaxNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="documentUrl">Document URL *</Label>
                  <Input
                    id="documentUrl"
                    placeholder="https://example.com/document.pdf"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    placeholder="document.pdf"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Fax Document"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <Button onClick={sendFax} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2">Send Fax</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fax Campaign Details</CardTitle>
              <Button onClick={() => fetchFaxDetails(1)} disabled={loading} variant="outline">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Refresh</span>
              </Button>
            </CardHeader>
            <CardContent>
              {faxDetails.length > 0 ? (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Showing {faxDetails.length} of {totalRecords} records
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>To Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faxDetails.map((fax) => (
                        <TableRow key={fax.id}>
                          <TableCell className="font-mono text-sm">{fax.id}</TableCell>
                          <TableCell>{fax.toFaxNumber}</TableCell>
                          <TableCell>{getStatusBadge(fax.status)}</TableCell>
                          <TableCell>{fax.pages || '-'}</TableCell>
                          <TableCell>{fax.subject || '-'}</TableCell>
                          <TableCell>
                            {fax.sentDate ? new Date(fax.sentDate).toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      onClick={() => fetchFaxDetails(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      variant="outline"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-4">
                      Page {currentPage}
                    </div>
                    <Button
                      onClick={() => fetchFaxDetails(currentPage + 1)}
                      disabled={faxDetails.length < 50 || loading}
                      variant="outline"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No fax records found. Click refresh to load data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
