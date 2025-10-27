import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Send, DollarSign, FileText, Upload, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GoFaxTest() {
  const [loading, setLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [faxDetails, setFaxDetails] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Send fax form state
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [formatting, setFormatting] = useState(false);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fax-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fax-documents')
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const addRecipient = () => {
    if (!newRecipient.trim()) {
      toast.error("Please enter a fax number");
      return;
    }
    if (recipients.includes(newRecipient)) {
      toast.error("This number is already in the list");
      return;
    }
    setRecipients([...recipients, newRecipient]);
    setNewRecipient("");
  };

  const removeRecipient = (number: string) => {
    setRecipients(recipients.filter(r => r !== number));
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setBulkNumbers(text);
    };
    reader.readAsText(file);
  };

  const formatBulkNumbers = async () => {
    if (!bulkNumbers.trim()) {
      toast.error("Please enter some numbers to format");
      return;
    }

    setFormatting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gofax-format-numbers', {
        body: { numbers: bulkNumbers }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      const newNumbers = data.formattedNumbers || [];
      const uniqueNumbers = [...new Set([...recipients, ...newNumbers])];
      setRecipients(uniqueNumbers);
      setBulkNumbers("");
      toast.success(`Added ${newNumbers.length} formatted numbers`);
    } catch (error) {
      console.error('Error formatting numbers:', error);
      toast.error("Failed to format numbers");
    } finally {
      setFormatting(false);
    }
  };

  const sendFax = async () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    if (!documentUrl) {
      toast.error("Please upload a document or provide a URL");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gofax-send-fax', {
        body: {
          recipients,
          documentUrl,
          fileName: uploadedFile?.name || "document.pdf",
          subject
        }
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(`Fax sent to ${recipients.length} recipient(s)!`);
      // Clear form
      setRecipients([]);
      setDocumentUrl("");
      setUploadedFile(null);
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
                  <Label htmlFor="fileUpload">Upload Document *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fileUpload"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <RefreshCw className="h-5 w-5 animate-spin" />}
                  </div>
                  {uploadedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                  {documentUrl && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ File ready to send
                    </p>
                  )}
                </div>

                <div>
                  <Label>Recipients ({recipients.length})</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="+61291234567"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                    />
                    <Button onClick={addRecipient} type="button" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 mb-2">
                    <Label>Bulk Add Numbers (paste or upload CSV)</Label>
                    <textarea
                      className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                      placeholder="Paste phone numbers here in any format... AI will clean and format them automatically"
                      value={bulkNumbers}
                      onChange={(e) => setBulkNumbers(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".csv,.txt,.xlsx"
                        onChange={handleCSVUpload}
                        className="flex-1"
                      />
                      <Button 
                        onClick={formatBulkNumbers} 
                        disabled={formatting || !bulkNumbers.trim()}
                        type="button"
                      >
                        {formatting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Format & Add"}
                      </Button>
                    </div>
                  </div>

                  {recipients.length > 0 && (
                    <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                      {recipients.map((number, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted px-2 py-1 rounded">
                          <span className="text-sm">{number}</span>
                          <Button
                            onClick={() => removeRecipient(number)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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

                <Button onClick={sendFax} disabled={loading || !documentUrl || recipients.length === 0}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2">Send Fax to {recipients.length} Recipient(s)</span>
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
