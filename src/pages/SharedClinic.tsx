import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Network, Server, Radio, Download, Mail, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ClinicConfig {
  id: string;
  location_name: string;
  ip_range: string | null;
  gateway: string | null;
}

interface DicomServer {
  id: string;
  name: string;
  ip_address: string;
  ae_title: string | null;
  port: number | null;
  function: string | null;
}

interface DicomModality {
  id: string;
  name: string;
  ip_address: string;
  ae_title: string | null;
  port: number | null;
  worklist_ip_address: string | null;
  worklist_ae_title: string | null;
  worklist_port: number | null;
}

export default function SharedClinic() {
  const { token } = useParams<{ token: string }>();
  const [clinic, setClinic] = useState<ClinicConfig | null>(null);
  const [servers, setServers] = useState<DicomServer[]>([]);
  const [modalities, setModalities] = useState<DicomModality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchSharedClinicData();
  }, [token]);

  const fetchSharedClinicData = async () => {
    if (!token) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Verify the share link and get clinic config
      const { data: shareLink, error: shareLinkError } = await supabase
        .from('clinic_shared_links')
        .select('clinic_network_config_id, is_active, expires_at')
        .eq('share_token', token)
        .maybeSingle();

      if (shareLinkError) throw shareLinkError;

      if (!shareLink) {
        setError('Share link not found or has expired');
        setIsLoading(false);
        return;
      }

      if (!shareLink.is_active) {
        setError('This share link has been disabled');
        setIsLoading(false);
        return;
      }

      if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
        setError('This share link has expired');
        setIsLoading(false);
        return;
      }

      // Fetch clinic config
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinic_network_configs')
        .select('id, location_name, ip_range, gateway')
        .eq('id', shareLink.clinic_network_config_id)
        .single();

      if (clinicError) throw clinicError;
      setClinic(clinicData);

      // Fetch DICOM servers
      const { data: serversData, error: serversError } = await supabase
        .from('dicom_servers')
        .select('*')
        .eq('clinic_network_config_id', shareLink.clinic_network_config_id);

      if (serversError) throw serversError;
      setServers(serversData || []);

      // Fetch DICOM modalities
      const { data: modalitiesData, error: modalitiesError } = await supabase
        .from('dicom_modalities')
        .select('*')
        .eq('clinic_network_config_id', shareLink.clinic_network_config_id);

      if (modalitiesError) throw modalitiesError;
      setModalities(modalitiesData || []);

    } catch (err: any) {
      console.error('Error fetching shared clinic data:', err);
      setError(err.message || 'Failed to load clinic data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateExcelFile = (): { base64: string; filename: string } | null => {
    if (!clinic) return null;

    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Clinic Details
      const clinicData = [
        ['Clinic Network Configuration'],
        [''],
        ['Location Name', clinic.location_name],
        ['IP Range', clinic.ip_range || 'Not specified'],
        ['Gateway', clinic.gateway || 'Not specified'],
      ];
      const clinicSheet = XLSX.utils.aoa_to_sheet(clinicData);
      clinicSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, clinicSheet, 'Clinic Details');

      // Sheet 2: DICOM Servers
      if (servers.length > 0) {
        const serversData = [
          ['DICOM Servers'],
          [''],
          ['Name', 'IP Address', 'AE Title', 'Port', 'Function'],
          ...servers.map(server => [
            server.name,
            server.ip_address,
            server.ae_title || '-',
            server.port?.toString() || '-',
            server.function || '-'
          ])
        ];
        const serversSheet = XLSX.utils.aoa_to_sheet(serversData);
        serversSheet['!cols'] = [
          { wch: 25 },
          { wch: 20 },
          { wch: 15 },
          { wch: 10 },
          { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, serversSheet, 'DICOM Servers');
      }

      // Sheet 3: Modalities
      if (modalities.length > 0) {
        const modalitiesData = [
          ['DICOM Modalities'],
          [''],
          ['Name', 'IP Address', 'AE Title', 'Port', 'Worklist IP', 'Worklist AE Title', 'Worklist Port'],
          ...modalities.map(modality => [
            modality.name,
            modality.ip_address,
            modality.ae_title || '-',
            modality.port?.toString() || '-',
            modality.worklist_ip_address || '-',
            modality.worklist_ae_title || '-',
            modality.worklist_port?.toString() || '-'
          ])
        ];
        const modalitiesSheet = XLSX.utils.aoa_to_sheet(modalitiesData);
        modalitiesSheet['!cols'] = [
          { wch: 25 },
          { wch: 20 },
          { wch: 15 },
          { wch: 10 },
          { wch: 20 },
          { wch: 20 },
          { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(workbook, modalitiesSheet, 'Modalities');
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${clinic.location_name.replace(/[^a-z0-9]/gi, '_')}_Network_Config_${timestamp}.xlsx`;

      // Generate binary string and convert to base64
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
      const base64 = btoa(wbout);

      return { base64, filename };
    } catch (error) {
      console.error('Error generating Excel file:', error);
      return null;
    }
  };

  const handleExportToExcel = () => {
    const result = generateExcelFile();
    if (!result) {
      toast.error('Failed to generate Excel file');
      return;
    }

    try {
      // Convert base64 back to binary for download
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel file exported successfully');
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !clinic || !token) {
      toast.error('Please enter a valid email address');
      return;
    }

    const excelData = generateExcelFile();
    if (!excelData) {
      toast.error('Failed to generate Excel file');
      return;
    }

    setIsSendingEmail(true);

    try {
      const { error } = await supabase.functions.invoke('send-clinic-details-email', {
        body: {
          to: recipientEmail,
          token: token,
          clinicName: clinic.location_name,
          excelBase64: excelData.base64,
          fileName: excelData.filename,
        },
      });

      if (error) throw error;

      toast.success('Email sent successfully!');
      setIsEmailDialogOpen(false);
      setRecipientEmail('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Network className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading clinic details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clinic) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                {clinic.location_name}
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={fetchSharedClinicData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button onClick={handleExportToExcel} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
                <Button onClick={() => setIsEmailDialogOpen(true)} variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Details
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {clinic.ip_range && (
                <div>
                  <span className="text-sm text-muted-foreground">IP Range:</span>
                  <p className="font-medium">{clinic.ip_range}</p>
                </div>
              )}
              {clinic.gateway && (
                <div>
                  <span className="text-sm text-muted-foreground">Gateway:</span>
                  <p className="font-medium">{clinic.gateway}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="servers">
              <Server className="w-4 h-4 mr-2" />
              DICOM Servers ({servers.length})
            </TabsTrigger>
            <TabsTrigger value="modalities">
              <Radio className="w-4 h-4 mr-2" />
              Modalities ({modalities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {servers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No DICOM servers configured</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>AE Title</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Function</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servers.map((server) => (
                        <TableRow key={server.id}>
                          <TableCell className="font-medium">{server.name}</TableCell>
                          <TableCell>{server.ip_address}</TableCell>
                          <TableCell>
                            {server.ae_title ? (
                              <Badge variant="outline">{server.ae_title}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{server.port || '-'}</TableCell>
                          <TableCell>{server.function || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modalities" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {modalities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No modalities configured</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>AE Title</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Worklist IP</TableHead>
                        <TableHead>Worklist AE</TableHead>
                        <TableHead>Worklist Port</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modalities.map((modality) => (
                        <TableRow key={modality.id}>
                          <TableCell className="font-medium">{modality.name}</TableCell>
                          <TableCell>{modality.ip_address}</TableCell>
                          <TableCell>
                            {modality.ae_title ? (
                              <Badge variant="outline">{modality.ae_title}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{modality.port || '-'}</TableCell>
                          <TableCell>{modality.worklist_ip_address || '-'}</TableCell>
                          <TableCell>
                            {modality.worklist_ae_title ? (
                              <Badge variant="outline">{modality.worklist_ae_title}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{modality.worklist_port || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email Clinic Details</DialogTitle>
              <DialogDescription>
                Send the network configuration details and Excel file to an email address.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@domain.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  disabled={isSendingEmail}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                The email will include a link to this page and an attached Excel file with all configuration details.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmail}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || !recipientEmail}>
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
