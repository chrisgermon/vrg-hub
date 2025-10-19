import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  FileUp, 
  Network,
  Server,
  MonitorDot
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Clinic {
  id: string;
  location_name: string;
  ip_range?: string;
  gateway?: string;
  notes?: string;
  created_at: string;
}

interface DicomServer {
  id: string;
  clinic_id: string;
  name: string;
  ip_address: string;
  ae_title?: string;
  port?: number;
  function?: string;
  notes?: string;
}

interface Modality {
  id: string;
  clinic_id: string;
  name: string;
  ip_address: string;
  ae_title?: string;
  port?: number;
  worklist_ip_address?: string;
  worklist_ae_title?: string;
  worklist_port?: number;
  modality_type?: string;
  notes?: string;
  brand_id?: string;
  location_id?: string;
}

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

interface Location {
  id: string;
  name: string;
  brand_id: string;
}

export function ModalityDetails() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [servers, setServers] = useState<DicomServer[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<any>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showClinicDialog, setShowClinicDialog] = useState(false);
  const [showModalityDialog, setShowModalityDialog] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  
  const { toast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  useEffect(() => {
    loadClinics();
    loadBrandsAndLocations();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      loadClinicData(selectedClinic);
    }
  }, [selectedClinic]);

  const loadBrandsAndLocations = async () => {
    try {
      const [brandsRes, locationsRes] = await Promise.all([
        supabase.from('brands').select('id, name, display_name').eq('is_active', true),
        supabase.from('locations').select('id, name, brand_id').eq('is_active', true),
      ]);

      if (brandsRes.error) throw brandsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setBrands(brandsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error loading brands and locations:', error);
    }
  };

  const loadClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('location_name');

      if (error) throw error;
      setClinics(data || []);
      
      if (data && data.length > 0 && !selectedClinic) {
        setSelectedClinic(data[0].id);
      }
    } catch (error) {
      console.error('Error loading clinics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClinicData = async (clinicId: string) => {
    try {
      const [serversRes, modalitiesRes] = await Promise.all([
        supabase.from('dicom_servers').select('*').eq('clinic_id', clinicId),
        supabase.from('modalities').select('*').eq('clinic_id', clinicId),
      ]);

      if (serversRes.error) throw serversRes.error;
      if (modalitiesRes.error) throw modalitiesRes.error;

      setServers(serversRes.data || []);
      setModalities(modalitiesRes.data || []);
    } catch (error) {
      console.error('Error loading clinic data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinic data',
        variant: 'destructive',
      });
    }
  };

  const handleImportWithAI = async () => {
    if (!importData.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste configuration data to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data: parsedData, error } = await supabase.functions.invoke('parse-modality-data', {
        body: { data: importData, type: 'configuration' }
      });

      if (error) throw error;

      // Check if we can detect brand/location
      let detectedBrand = null;
      let detectedLocation = null;

      if (parsedData.detected_brand) {
        detectedBrand = brands.find(b => 
          b.name.toLowerCase().includes(parsedData.detected_brand.toLowerCase()) ||
          b.display_name.toLowerCase().includes(parsedData.detected_brand.toLowerCase())
        );
      }

      if (parsedData.detected_location) {
        detectedLocation = locations.find(l => 
          l.name.toLowerCase().includes(parsedData.detected_location.toLowerCase())
        );
      }

      // If we couldn't detect, prompt user to select
      if (!detectedBrand || !detectedLocation) {
        setParsedImportData(parsedData);
        setSelectedBrandId(detectedBrand?.id || null);
        setSelectedLocationId(detectedLocation?.id || null);
        setShowImportDialog(false);
        setShowLocationSelector(true);
        setIsImporting(false);
        return;
      }

      // Auto-detected, proceed with import
      await completeImport(parsedData, detectedBrand.id, detectedLocation.id);
    } catch (error: any) {
      console.error('Error importing data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import configuration',
        variant: 'destructive',
      });
      setIsImporting(false);
    }
  };

  const completeImport = async (parsedData: any, brandId: string, locationId: string) => {
    setIsImporting(true);

    try {
      // Create clinic
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          location_name: parsedData.clinic_config.location_name,
          ip_range: parsedData.clinic_config.ip_range,
          gateway: parsedData.clinic_config.gateway,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Create servers
      if (parsedData.servers && parsedData.servers.length > 0) {
        const serversToInsert = parsedData.servers.map((s: any) => ({
          clinic_id: clinic.id,
          name: s.name,
          ip_address: s.ip_address,
          ae_title: s.ae_title,
          port: s.port,
          function: s.function,
        }));

        const { error: serversError } = await supabase
          .from('dicom_servers')
          .insert(serversToInsert);

        if (serversError) throw serversError;
      }

      // Create modalities with brand and location
      if (parsedData.modalities && parsedData.modalities.length > 0) {
        const modalitiesToInsert = parsedData.modalities.map((m: any) => ({
          clinic_id: clinic.id,
          name: m.name,
          ip_address: m.ip_address,
          ae_title: m.ae_title,
          port: m.port,
          worklist_ip_address: m.worklist_ip_address,
          worklist_ae_title: m.worklist_ae_title,
          worklist_port: m.worklist_port,
          modality_type: m.modality_type,
          brand_id: brandId,
          location_id: locationId,
        }));

        const { error: modalitiesError } = await supabase
          .from('modalities')
          .insert(modalitiesToInsert);

        if (modalitiesError) throw modalitiesError;
      }

      toast({
        title: 'Success',
        description: `Configuration imported successfully with ${parsedData.modalities?.length || 0} modalities`,
      });

      setShowImportDialog(false);
      setShowLocationSelector(false);
      setImportData('');
      setParsedImportData(null);
      loadClinics();
      setSelectedClinic(clinic.id);
    } catch (error: any) {
      console.error('Error completing import:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmLocationSelection = () => {
    if (!selectedBrandId || !selectedLocationId) {
      toast({
        title: 'Error',
        description: 'Please select both brand and location',
        variant: 'destructive',
      });
      return;
    }

    completeImport(parsedImportData, selectedBrandId, selectedLocationId);
  };

  const handleSaveClinic = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const clinicData = {
        location_name: formData.get('location_name') as string,
        ip_range: formData.get('ip_range') as string,
        gateway: formData.get('gateway') as string,
        notes: formData.get('notes') as string,
      };

      if (editingClinic) {
        const { error } = await supabase
          .from('clinics')
          .update(clinicData)
          .eq('id', editingClinic.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinics')
          .insert(clinicData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Clinic ${editingClinic ? 'updated' : 'created'} successfully`,
      });

      setShowClinicDialog(false);
      setEditingClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to save clinic',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClinic = async (id: string) => {
    if (!confirm('Are you sure? This will delete all servers and modalities for this clinic.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Clinic deleted successfully',
      });

      loadClinics();
      if (selectedClinic === id) {
        setSelectedClinic(null);
      }
    } catch (error) {
      console.error('Error deleting clinic:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete clinic',
        variant: 'destructive',
      });
    }
  };

  const handleSaveModality = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (!selectedClinic) {
      toast({
        title: 'Error',
        description: 'Please select a clinic first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const modalityData = {
        clinic_id: selectedClinic,
        name: formData.get('name') as string,
        ip_address: formData.get('ip_address') as string,
        ae_title: formData.get('ae_title') as string || null,
        port: formData.get('port') ? parseInt(formData.get('port') as string) : null,
        worklist_ip_address: formData.get('worklist_ip_address') as string || null,
        worklist_ae_title: formData.get('worklist_ae_title') as string || null,
        worklist_port: formData.get('worklist_port') ? parseInt(formData.get('worklist_port') as string) : null,
        modality_type: formData.get('modality_type') as string || null,
        notes: formData.get('notes') as string || null,
        brand_id: formData.get('brand_id') as string || null,
        location_id: formData.get('location_id') as string || null,
      };

      if (editingModality) {
        const { error } = await supabase
          .from('modalities')
          .update(modalityData)
          .eq('id', editingModality.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modalities')
          .insert(modalityData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Modality ${editingModality ? 'updated' : 'created'} successfully`,
      });

      setShowModalityDialog(false);
      setEditingModality(null);
      loadClinicData(selectedClinic);
    } catch (error) {
      console.error('Error saving modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to save modality',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteModality = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modality?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Modality deleted successfully',
      });

      if (selectedClinic) {
        loadClinicData(selectedClinic);
      }
    } catch (error) {
      console.error('Error deleting modality:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete modality',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const selectedClinicData = clinics.find(c => c.id === selectedClinic);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="w-8 h-8" />
            Modality Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage DICOM modalities, servers, and network configurations
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileUp className="w-4 h-4 mr-2" />
                  Import with AI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Configuration with AI</DialogTitle>
                  <DialogDescription>
                    Paste your DICOM configuration data and AI will automatically extract and organize it
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Paste configuration data here..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportDialog(false)}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImportWithAI} disabled={isImporting}>
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4 mr-2" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showLocationSelector} onOpenChange={setShowLocationSelector}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Brand and Location</DialogTitle>
                  <DialogDescription>
                    Please select the brand and location for this modality configuration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Brand *</Label>
                    <Select value={selectedBrandId || undefined} onValueChange={setSelectedBrandId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Select 
                      value={selectedLocationId || undefined} 
                      onValueChange={setSelectedLocationId}
                      disabled={!selectedBrandId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations
                          .filter(l => !selectedBrandId || l.brand_id === selectedBrandId)
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowLocationSelector(false);
                        setParsedImportData(null);
                        setSelectedBrandId(null);
                        setSelectedLocationId(null);
                      }}
                      disabled={isImporting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConfirmLocationSelection}
                      disabled={isImporting || !selectedBrandId || !selectedLocationId}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        'Confirm & Import'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showClinicDialog} onOpenChange={setShowClinicDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingClinic(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Clinic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClinic ? 'Edit' : 'Add'} Clinic</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveClinic} className="space-y-4">
                  <div>
                    <Label htmlFor="location_name">Location Name *</Label>
                    <Input
                      id="location_name"
                      name="location_name"
                      defaultValue={editingClinic?.location_name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ip_range">IP Range</Label>
                    <Input
                      id="ip_range"
                      name="ip_range"
                      defaultValue={editingClinic?.ip_range}
                      placeholder="e.g., 192.168.1.0/24"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gateway">Gateway</Label>
                    <Input
                      id="gateway"
                      name="gateway"
                      defaultValue={editingClinic?.gateway}
                      placeholder="e.g., 192.168.1.1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingClinic?.notes}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowClinicDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {clinics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Network className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Clinics Configured</h3>
            <p className="text-muted-foreground mb-4">
              Add a clinic manually or import configuration data with AI
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Select Clinic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClinic || undefined} onValueChange={setSelectedClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedClinicData && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="font-medium">{selectedClinicData.location_name}</p>
                      {selectedClinicData.ip_range && (
                        <p className="text-sm text-muted-foreground">
                          IP Range: {selectedClinicData.ip_range}
                        </p>
                      )}
                      {selectedClinicData.gateway && (
                        <p className="text-sm text-muted-foreground">
                          Gateway: {selectedClinicData.gateway}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingClinic(selectedClinicData);
                            setShowClinicDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClinic(selectedClinicData.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedClinic && (
            <Tabs defaultValue="modalities">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="modalities">
                  <MonitorDot className="w-4 h-4 mr-2" />
                  Modalities ({modalities.length})
                </TabsTrigger>
                <TabsTrigger value="servers">
                  <Server className="w-4 h-4 mr-2" />
                  DICOM Servers ({servers.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modalities">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Modalities</CardTitle>
                    {isAdmin && (
                      <Dialog open={showModalityDialog} onOpenChange={setShowModalityDialog}>
                        <DialogTrigger asChild>
                          <Button onClick={() => setEditingModality(null)} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Modality
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingModality ? 'Edit' : 'Add'} Modality</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSaveModality} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  defaultValue={editingModality?.name}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="brand_id">Brand</Label>
                                <Select name="brand_id" defaultValue={editingModality?.brand_id || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select brand" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brands.map((brand) => (
                                      <SelectItem key={brand.id} value={brand.id}>
                                        {brand.display_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="location_id">Location</Label>
                                <Select name="location_id" defaultValue={editingModality?.location_id || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {locations.map((location) => (
                                      <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="modality_type">Type</Label>
                                <Select name="modality_type" defaultValue={editingModality?.modality_type || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CT">CT</SelectItem>
                                    <SelectItem value="MR">MR</SelectItem>
                                    <SelectItem value="XA">XA</SelectItem>
                                    <SelectItem value="US">US</SelectItem>
                                    <SelectItem value="CR">CR</SelectItem>
                                    <SelectItem value="DX">DX</SelectItem>
                                    <SelectItem value="MG">MG</SelectItem>
                                    <SelectItem value="NM">NM</SelectItem>
                                    <SelectItem value="PT">PT</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="ip_address">IP Address *</Label>
                                <Input
                                  id="ip_address"
                                  name="ip_address"
                                  defaultValue={editingModality?.ip_address}
                                  placeholder="192.168.1.10"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="ae_title">AE Title</Label>
                                <Input
                                  id="ae_title"
                                  name="ae_title"
                                  defaultValue={editingModality?.ae_title}
                                  placeholder="MODALITY_AE"
                                />
                              </div>
                              <div>
                                <Label htmlFor="port">Port</Label>
                                <Input
                                  id="port"
                                  name="port"
                                  type="number"
                                  defaultValue={editingModality?.port}
                                  placeholder="104"
                                />
                              </div>
                              <div className="col-span-2 border-t pt-4">
                                <h4 className="font-semibold mb-3">Worklist Configuration</h4>
                              </div>
                              <div>
                                <Label htmlFor="worklist_ip_address">Worklist IP</Label>
                                <Input
                                  id="worklist_ip_address"
                                  name="worklist_ip_address"
                                  defaultValue={editingModality?.worklist_ip_address}
                                  placeholder="192.168.1.11"
                                />
                              </div>
                              <div>
                                <Label htmlFor="worklist_ae_title">Worklist AE Title</Label>
                                <Input
                                  id="worklist_ae_title"
                                  name="worklist_ae_title"
                                  defaultValue={editingModality?.worklist_ae_title}
                                  placeholder="WORKLIST_AE"
                                />
                              </div>
                              <div>
                                <Label htmlFor="worklist_port">Worklist Port</Label>
                                <Input
                                  id="worklist_port"
                                  name="worklist_port"
                                  type="number"
                                  defaultValue={editingModality?.worklist_port}
                                  placeholder="104"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                  id="notes"
                                  name="notes"
                                  defaultValue={editingModality?.notes}
                                  rows={3}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button type="button" variant="outline" onClick={() => setShowModalityDialog(false)}>
                                Cancel
                              </Button>
                              <Button type="submit">Save</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardHeader>
                  <CardContent>
                    {modalities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No modalities configured for this clinic
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Brand</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>IP Address</TableHead>
                              <TableHead>AE Title</TableHead>
                              <TableHead>Port</TableHead>
                              <TableHead>Worklist</TableHead>
                              {isAdmin && <TableHead>Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {modalities.map((modality) => {
                              const brand = brands.find(b => b.id === modality.brand_id);
                              const location = locations.find(l => l.id === modality.location_id);
                              return (
                                <TableRow key={modality.id}>
                                  <TableCell className="font-medium">{modality.name}</TableCell>
                                  <TableCell>{brand?.display_name || '-'}</TableCell>
                                  <TableCell>{location?.name || '-'}</TableCell>
                                  <TableCell>{modality.ip_address}</TableCell>
                                  <TableCell>{modality.ae_title || '-'}</TableCell>
                                  <TableCell>{modality.port || '-'}</TableCell>
                                  <TableCell>
                                    {modality.worklist_ip_address ? (
                                      <Badge variant="success">Configured</Badge>
                                    ) : (
                                      <Badge variant="secondary">None</Badge>
                                    )}
                                  </TableCell>
                                  {isAdmin && (
                                    <TableCell>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingModality(modality);
                                            setShowModalityDialog(true);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteModality(modality.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="servers">
                <Card>
                  <CardHeader>
                    <CardTitle>DICOM Servers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {servers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No DICOM servers configured for this clinic
                      </div>
                    ) : (
                      <div className="rounded-md border">
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
                                <TableCell>{server.ae_title || '-'}</TableCell>
                                <TableCell>{server.port || '-'}</TableCell>
                                <TableCell>{server.function || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}
