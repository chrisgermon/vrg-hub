import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Server, Radio, Network, Upload, FileText, Share2, Copy, Check, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface ClinicConfig {
  id: string;
  company_id: string;
  location_name: string;
  ip_range: string | null;
  gateway: string | null;
  created_at: string;
  updated_at: string;
}

interface DicomServer {
  id: string;
  clinic_network_config_id: string;
  name: string;
  ip_address: string;
  ae_title: string | null;
  port: number | null;
  function: string | null;
}

interface DicomModality {
  id: string;
  clinic_network_config_id: string;
  name: string;
  ip_address: string;
  ae_title: string | null;
  port: number | null;
  worklist_ip_address: string | null;
  worklist_ae_title: string | null;
  worklist_port: number | null;
}

interface Company {
  id: string;
  name: string;
}

export const ModalityDetails: React.FC = () => {
  const [clinicConfigs, setClinicConfigs] = useState<ClinicConfig[]>([]);
  const [servers, setServers] = useState<DicomServer[]>([]);
  const [modalities, setModalities] = useState<DicomModality[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [modalityDialogOpen, setModalityDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<ClinicConfig | null>(null);
  const [editingServer, setEditingServer] = useState<DicomServer | null>(null);
  const [editingModality, setEditingModality] = useState<DicomModality | null>(null);
  const [pastedData, setPastedData] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [aiImportCompanyId, setAiImportCompanyId] = useState<string>('');
  const { toast } = useToast();
  const { profile, userRole, company } = useAuth();
  
  // Check if user is part of any company (no special Crowd IT treatment)
  const hasCompany = company !== null;

  // Form states
  const [formData, setFormData] = useState({
    company_id: '',
    location_name: '',
    ip_range: '',
    gateway: ''
  });

  const [serverFormData, setServerFormData] = useState({
    name: '',
    ip_address: '',
    ae_title: '',
    port: '',
    function: ''
  });

  const [modalityFormData, setModalityFormData] = useState({
    name: '',
    ip_address: '',
    ae_title: '',
    port: '',
    worklist_ip_address: '',
    worklist_ae_title: '',
    worklist_port: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchClinicDetails(selectedClinic);
    }
  }, [selectedClinic]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Build query for clinic configs
      let configQuery = supabase
        .from('clinic_network_configs')
        .select('*')
        .order('location_name');

      // Filter by company for non-super-admins
      if (userRole !== 'super_admin' && company) {
        configQuery = configQuery.eq('company_id', company.id);
      }

      const { data: configsData, error: configsError } = await configQuery;

      if (configsError) throw configsError;
      setClinicConfigs(configsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load modality details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClinicDetails = async (clinicId: string) => {
    try {
      const { data: serversData, error: serversError } = await supabase
        .from('dicom_servers')
        .select('*')
        .eq('clinic_network_config_id', clinicId);

      if (serversError) throw serversError;
      setServers(serversData || []);

      const { data: modalitiesData, error: modalitiesError } = await supabase
        .from('dicom_modalities')
        .select('*')
        .eq('clinic_network_config_id', clinicId);

      if (modalitiesError) throw modalitiesError;
      setModalities(modalitiesData || []);

    } catch (error: any) {
      console.error('Error fetching clinic details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinic details',
        variant: 'destructive',
      });
    }
  };

  const handleParseWithAI = async () => {
    if (!pastedData.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste or upload data first',
        variant: 'destructive',
      });
      return;
    }

    if (!aiImportCompanyId) {
      toast({
        title: 'Error',
        description: 'Please select a company first',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-modality-data', {
        body: { data: pastedData, type: 'text' }
      });

      if (error) throw error;

      // Populate the clinic form with parsed data using the selected company
      setFormData({
        company_id: aiImportCompanyId,
        location_name: data.clinic_config.location_name,
        ip_range: data.clinic_config.ip_range || '',
        gateway: data.clinic_config.gateway || ''
      });

      setAiDialogOpen(false);
      setDialogOpen(true);
      
      // Store parsed servers and modalities for later
      sessionStorage.setItem('parsedServers', JSON.stringify(data.servers));
      sessionStorage.setItem('parsedModalities', JSON.stringify(data.modalities));

      toast({
        title: 'Success',
        description: `Parsed ${data.servers.length} servers and ${data.modalities.length} modalities`,
      });
    } catch (error: any) {
      console.error('Error parsing data:', error);
      
      // Handle payment required error (402)
      if (error?.message?.includes('402') || error?.message?.includes('Payment required')) {
        toast({
          title: 'AI Credits Required',
          description: 'Please add credits to your Lovable AI workspace to use this feature. Go to Settings → Workspace → Usage to top up.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to parse data with AI',
          variant: 'destructive',
        });
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let clinicId: string;
      
      if (editingClinic) {
        const { error } = await supabase
          .from('clinic_network_configs')
          .update({
            company_id: formData.company_id,
            location_name: formData.location_name,
            ip_range: formData.ip_range || null,
            gateway: formData.gateway || null,
          })
          .eq('id', editingClinic.id);

        if (error) throw error;
        clinicId = editingClinic.id;
        toast({ title: 'Success', description: 'Clinic updated successfully' });
      } else {
        const { data: newClinic, error } = await supabase
          .from('clinic_network_configs')
          .insert({
            company_id: formData.company_id,
            location_name: formData.location_name,
            ip_range: formData.ip_range || null,
            gateway: formData.gateway || null,
          })
          .select()
          .single();

        if (error) throw error;
        clinicId = newClinic.id;
        
        // If we have parsed data, create servers and modalities
        const parsedServers = sessionStorage.getItem('parsedServers');
        const parsedModalities = sessionStorage.getItem('parsedModalities');
        
        if (parsedServers) {
          const servers = JSON.parse(parsedServers);
          for (const server of servers) {
            await supabase.from('dicom_servers').insert({
              clinic_network_config_id: clinicId,
              ...server
            });
          }
          sessionStorage.removeItem('parsedServers');
        }
        
        if (parsedModalities) {
          const modalities = JSON.parse(parsedModalities);
          for (const modality of modalities) {
            await supabase.from('dicom_modalities').insert({
              clinic_network_config_id: clinicId,
              ...modality
            });
          }
          sessionStorage.removeItem('parsedModalities');
        }
        
        toast({ title: 'Success', description: 'Clinic created successfully' });
      }

      setDialogOpen(false);
      setEditingClinic(null);
      setFormData({ company_id: '', location_name: '', ip_range: '', gateway: '' });
      fetchData();
      setSelectedClinic(clinicId);
    } catch (error: any) {
      console.error('Error saving clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to save clinic',
        variant: 'destructive',
      });
    }
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;

    try {
      const serverData = {
        clinic_network_config_id: selectedClinic,
        name: serverFormData.name,
        ip_address: serverFormData.ip_address,
        ae_title: serverFormData.ae_title || null,
        port: serverFormData.port ? parseInt(serverFormData.port) : null,
        function: serverFormData.function || null,
      };

      if (editingServer) {
        const { error } = await supabase
          .from('dicom_servers')
          .update(serverData)
          .eq('id', editingServer.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Server updated successfully' });
      } else {
        const { error } = await supabase
          .from('dicom_servers')
          .insert(serverData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Server created successfully' });
      }

      setServerDialogOpen(false);
      setEditingServer(null);
      setServerFormData({ name: '', ip_address: '', ae_title: '', port: '', function: '' });
      fetchClinicDetails(selectedClinic);
    } catch (error: any) {
      console.error('Error saving server:', error);
      toast({
        title: 'Error',
        description: 'Failed to save server',
        variant: 'destructive',
      });
    }
  };

  const handleSaveModality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;

    try {
      const modalityData = {
        clinic_network_config_id: selectedClinic,
        name: modalityFormData.name,
        ip_address: modalityFormData.ip_address,
        ae_title: modalityFormData.ae_title || null,
        port: modalityFormData.port ? parseInt(modalityFormData.port) : null,
        worklist_ip_address: modalityFormData.worklist_ip_address || null,
        worklist_ae_title: modalityFormData.worklist_ae_title || null,
        worklist_port: modalityFormData.worklist_port ? parseInt(modalityFormData.worklist_port) : null,
      };

      if (editingModality) {
        const { error } = await supabase
          .from('dicom_modalities')
          .update(modalityData)
          .eq('id', editingModality.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Modality updated successfully' });
      } else {
        const { error } = await supabase
          .from('dicom_modalities')
          .insert(modalityData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Modality created successfully' });
      }

      setModalityDialogOpen(false);
      setEditingModality(null);
      setModalityFormData({ name: '', ip_address: '', ae_title: '', port: '', worklist_ip_address: '', worklist_ae_title: '', worklist_port: '' });
      fetchClinicDetails(selectedClinic);
    } catch (error: any) {
      console.error('Error saving modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to save modality',
        variant: 'destructive',
      });
    }
  };

  const handleEditClinic = (clinic: ClinicConfig) => {
    setEditingClinic(clinic);
    setFormData({
      company_id: clinic.company_id,
      location_name: clinic.location_name,
      ip_range: clinic.ip_range || '',
      gateway: clinic.gateway || ''
    });
    setDialogOpen(true);
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('Delete this clinic configuration? This will also delete all associated servers and modalities.')) return;

    try {
      const { error } = await supabase
        .from('clinic_network_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Clinic deleted successfully' });
      if (selectedClinic === id) {
        setSelectedClinic(null);
      }
      fetchData();
    } catch (error: any) {
      console.error('Error deleting clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clinic',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Delete this server?')) return;

    try {
      const { error } = await supabase
        .from('dicom_servers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Server deleted successfully' });
      if (selectedClinic) fetchClinicDetails(selectedClinic);
    } catch (error: any) {
      console.error('Error deleting server:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete server',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteModality = async (id: string) => {
    if (!confirm('Delete this modality?')) return;

    try {
      const { error } = await supabase
        .from('dicom_modalities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Modality deleted successfully' });
      if (selectedClinic) fetchClinicDetails(selectedClinic);
    } catch (error: any) {
      console.error('Error deleting modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete modality',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateShareLink = async (clinicId: string) => {
    try {
      const { data: existingLink, error: fetchError } = await supabase
        .from('clinic_shared_links')
        .select('share_token, is_active')
        .eq('clinic_network_config_id', clinicId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let token: string;
      
      if (existingLink) {
        token = existingLink.share_token;
      } else {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');

        const { data: newLink, error: insertError } = await supabase
          .from('clinic_shared_links')
          .insert({
            clinic_network_config_id: clinicId,
            created_by: user.user.id,
            is_active: true
          })
          .select('share_token')
          .single();

        if (insertError) throw insertError;
        token = newLink.share_token;
      }

      const link = `https://crowdhub.app/shared/${token}`;
      setShareLink(link);
      setShareDialogOpen(true);
      setCopied(false);
    } catch (error: any) {
      console.error('Error generating share link:', error);
      setShareError(error.message || 'Failed to generate share link');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: 'Success',
        description: 'Link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const filteredClinics = clinicConfigs.filter(clinic => {
    const matchesSearch = clinic.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.ip_range?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.gateway?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = companyFilter === 'all' || clinic.company_id === companyFilter;
    
    return matchesSearch && matchesCompany;
  });

  const getCompanyName = (companyId: string) => {
    return companies.find(c => c.id === companyId)?.name || 'Unknown';
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Clinic Modality Details
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {userRole === 'super_admin' && (
                <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => {
                      setPastedData('');
                      setAiImportCompanyId(company?.id || '');
                    }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import with AI
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import Modality Data with AI</DialogTitle>
                      <DialogDescription>
                        Select the company and paste data from Excel or text file. AI will automatically extract clinic configs, servers, and modalities.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          First select the company this clinic belongs to, then paste the configuration data.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label>Company *</Label>
                        <Select value={aiImportCompanyId} onValueChange={setAiImportCompanyId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map(comp => (
                              <SelectItem key={comp.id} value={comp.id}>
                                {comp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Paste Data</Label>
                        <Textarea
                          value={pastedData}
                          onChange={(e) => setPastedData(e.target.value)}
                          placeholder="Paste your modality configuration data here..."
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setAiDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleParseWithAI} disabled={isParsing || !aiImportCompanyId}>
                          {isParsing ? 'Parsing...' : 'Parse with AI'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingClinic(null);
                    setFormData({ company_id: '', location_name: '', ip_range: '', gateway: '' });
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Clinic
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingClinic ? 'Edit Clinic' : 'Add Clinic'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveClinic} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Select value={formData.company_id} onValueChange={(value) => setFormData({...formData, company_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map(company => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location Name</Label>
                      <Input
                        value={formData.location_name}
                        onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                        placeholder="e.g., Warilla"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IP Range / Subnet</Label>
                      <Input
                        value={formData.ip_range}
                        onChange={(e) => setFormData({...formData, ip_range: e.target.value})}
                        placeholder="e.g., 10.0.0.0/24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gateway</Label>
                      <Input
                        value={formData.gateway}
                        onChange={(e) => setFormData({...formData, gateway: e.target.value})}
                        placeholder="e.g., 10.0.0.138"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search clinics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {userRole === 'super_admin' && companies.length > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Filter by company:</Label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="All companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {companies.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClinics.map((clinic) => (
              <Card
                key={clinic.id}
                className={`cursor-pointer transition-colors ${
                  selectedClinic === clinic.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedClinic(clinic.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{clinic.location_name}</h3>
                      <Badge variant="outline" className="mt-1">{getCompanyName(clinic.company_id)}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCopied(false);
                          setShareLink('');
                          setShareError(null);
                          setIsGeneratingShare(true);
                          setShareDialogOpen(true);
                          handleGenerateShareLink(clinic.id);
                        }}
                        title="Generate share link"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClinic(clinic);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClinic(clinic.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {clinic.ip_range && (
                    <p className="text-sm text-muted-foreground">IP: {clinic.ip_range}</p>
                  )}
                  {clinic.gateway && (
                    <p className="text-sm text-muted-foreground">Gateway: {clinic.gateway}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedClinic && (
        <Card>
          <CardHeader>
            <CardTitle>
              {clinicConfigs.find(c => c.id === selectedClinic)?.location_name} - Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="servers">
              <TabsList>
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
                <div className="flex justify-end">
                  <Dialog open={serverDialogOpen} onOpenChange={setServerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => {
                        setEditingServer(null);
                        setServerFormData({ name: '', ip_address: '', ae_title: '', port: '', function: '' });
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Server
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingServer ? 'Edit Server' : 'Add Server'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveServer} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={serverFormData.name}
                            onChange={(e) => setServerFormData({...serverFormData, name: e.target.value})}
                            placeholder="e.g., PACS"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>IP Address</Label>
                          <Input
                            value={serverFormData.ip_address}
                            onChange={(e) => setServerFormData({...serverFormData, ip_address: e.target.value})}
                            placeholder="e.g., 10.0.0.3"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>AE Title</Label>
                          <Input
                            value={serverFormData.ae_title}
                            onChange={(e) => setServerFormData({...serverFormData, ae_title: e.target.value})}
                            placeholder="e.g., WDIGATEWAY"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            type="number"
                            value={serverFormData.port}
                            onChange={(e) => setServerFormData({...serverFormData, port: e.target.value})}
                            placeholder="e.g., 11112"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Function</Label>
                          <Input
                            value={serverFormData.function}
                            onChange={(e) => setServerFormData({...serverFormData, function: e.target.value})}
                            placeholder="e.g., DICOM Storage"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setServerDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Save</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>AE Title</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Function</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id}>
                        <TableCell className="font-medium">{server.name}</TableCell>
                        <TableCell>{server.ip_address}</TableCell>
                        <TableCell>{server.ae_title || '-'}</TableCell>
                        <TableCell>{server.port || '-'}</TableCell>
                        <TableCell>{server.function || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingServer(server);
                                setServerFormData({
                                  name: server.name,
                                  ip_address: server.ip_address,
                                  ae_title: server.ae_title || '',
                                  port: server.port?.toString() || '',
                                  function: server.function || ''
                                });
                                setServerDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteServer(server.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {servers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No servers configured
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="modalities" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={modalityDialogOpen} onOpenChange={setModalityDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => {
                        setEditingModality(null);
                        setModalityFormData({ name: '', ip_address: '', ae_title: '', port: '', worklist_ip_address: '', worklist_ae_title: '', worklist_port: '' });
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Modality
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingModality ? 'Edit Modality' : 'Add Modality'}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSaveModality} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={modalityFormData.name}
                            onChange={(e) => setModalityFormData({...modalityFormData, name: e.target.value})}
                            placeholder="e.g., Warilla Xray"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>IP Address</Label>
                          <Input
                            value={modalityFormData.ip_address}
                            onChange={(e) => setModalityFormData({...modalityFormData, ip_address: e.target.value})}
                            placeholder="e.g., 10.0.0.30"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>AE Title</Label>
                          <Input
                            value={modalityFormData.ae_title}
                            onChange={(e) => setModalityFormData({...modalityFormData, ae_title: e.target.value})}
                            placeholder="e.g., WARXRAY"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            type="number"
                            value={modalityFormData.port}
                            onChange={(e) => setModalityFormData({...modalityFormData, port: e.target.value})}
                            placeholder="e.g., 104"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Worklist IP Address</Label>
                          <Input
                            value={modalityFormData.worklist_ip_address}
                            onChange={(e) => setModalityFormData({...modalityFormData, worklist_ip_address: e.target.value})}
                            placeholder="e.g., 10.17.1.21"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Worklist AE Title</Label>
                          <Input
                            value={modalityFormData.worklist_ae_title}
                            onChange={(e) => setModalityFormData({...modalityFormData, worklist_ae_title: e.target.value})}
                            placeholder="e.g., WARCRWL"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Worklist Port</Label>
                          <Input
                            type="number"
                            value={modalityFormData.worklist_port}
                            onChange={(e) => setModalityFormData({...modalityFormData, worklist_port: e.target.value})}
                            placeholder="e.g., 5010"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setModalityDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Save</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

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
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalities.map((modality) => (
                      <TableRow key={modality.id}>
                        <TableCell className="font-medium">{modality.name}</TableCell>
                        <TableCell>{modality.ip_address}</TableCell>
                        <TableCell>{modality.ae_title || '-'}</TableCell>
                        <TableCell>{modality.port || '-'}</TableCell>
                        <TableCell>{modality.worklist_ip_address || '-'}</TableCell>
                        <TableCell>{modality.worklist_ae_title || '-'}</TableCell>
                        <TableCell>{modality.worklist_port || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingModality(modality);
                                setModalityFormData({
                                  name: modality.name,
                                  ip_address: modality.ip_address,
                                  ae_title: modality.ae_title || '',
                                  port: modality.port?.toString() || '',
                                  worklist_ip_address: modality.worklist_ip_address || '',
                                  worklist_ae_title: modality.worklist_ae_title || '',
                                  worklist_port: modality.worklist_port?.toString() || ''
                                });
                                setModalityDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteModality(modality.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {modalities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No modalities configured
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Share Link Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Clinic Details</DialogTitle>
              <DialogDescription>
                Generate and copy a read-only link to share modality details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isGeneratingShare ? (
                <div className="text-sm text-muted-foreground">Generating link…</div>
              ) : shareError ? (
                <Alert variant="destructive">
                  <AlertDescription>{shareError}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <AlertDescription>
                      Anyone with this link can view the clinic's modality details without logging in.
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button onClick={handleCopyLink} variant="outline" size="icon" disabled={!shareLink}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

