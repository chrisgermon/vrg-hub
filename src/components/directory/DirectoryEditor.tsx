import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Extension {
  department: string;
  extension: string;
}

interface Clinic {
  id?: string;
  brand_id: string;
  name: string;
  phone: string;
  address: string;
  fax: string;
  region: 'melbourne' | 'regional';
  extensions: Extension[];
  sort_order: number;
  is_active: boolean;
}

interface Contact {
  id?: string;
  brand_id: string;
  name: string;
  title: string;
  phone?: string;
  email?: string;
  contact_type: 'admin' | 'marketing';
  sort_order: number;
  is_active: boolean;
}

interface Brand {
  id: string;
  name: string;
  display_name: string;
}

export default function DirectoryEditor() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchData();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from('brands')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('sort_order');
    
    if (data) {
      setBrands(data);
      if (data.length > 0) setSelectedBrand(data[0].id);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const [clinicsRes, contactsRes] = await Promise.all([
      supabase
        .from('directory_clinics')
        .select('*')
        .eq('brand_id', selectedBrand)
        .order('sort_order'),
      supabase
        .from('directory_contacts')
        .select('*')
        .eq('brand_id', selectedBrand)
        .order('sort_order')
    ]);

    if (clinicsRes.data) {
      setClinics(clinicsRes.data.map(c => ({
        ...c,
        region: c.region as 'melbourne' | 'regional',
        extensions: c.extensions as unknown as Extension[]
      })));
    }
    if (contactsRes.data) {
      setContacts(contactsRes.data.map(c => ({
        ...c,
        contact_type: c.contact_type as 'admin' | 'marketing'
      })));
    }
    setIsLoading(false);
  };

  const saveClinic = async (clinic: Clinic) => {
    const clinicData = {
      ...clinic,
      extensions: clinic.extensions as any
    };
    
    const { error } = clinic.id
      ? await supabase.from('directory_clinics').update(clinicData).eq('id', clinic.id)
      : await supabase.from('directory_clinics').insert([clinicData]);

    if (error) {
      toast.error('Failed to save clinic');
    } else {
      toast.success('Clinic saved successfully');
      fetchData();
      setEditingClinic(null);
    }
  };

  const deleteClinic = async (id: string) => {
    const { error } = await supabase.from('directory_clinics').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete clinic');
    } else {
      toast.success('Clinic deleted successfully');
      fetchData();
    }
  };

  const saveContact = async (contact: Contact) => {
    const { error } = contact.id
      ? await supabase.from('directory_contacts').update(contact).eq('id', contact.id)
      : await supabase.from('directory_contacts').insert(contact);

    if (error) {
      toast.error('Failed to save contact');
    } else {
      toast.success('Contact saved successfully');
      fetchData();
      setEditingContact(null);
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('directory_contacts').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete contact');
    } else {
      toast.success('Contact deleted successfully');
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phone Directory Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Select Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
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

            <Tabs defaultValue="clinics">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clinics">Clinics</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
              </TabsList>

              <TabsContent value="clinics" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Clinics</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingClinic({
                        brand_id: selectedBrand,
                        name: '',
                        phone: '',
                        address: '',
                        fax: '',
                        region: 'melbourne',
                        extensions: [],
                        sort_order: 0,
                        is_active: true
                      })}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Clinic
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingClinic?.id ? 'Edit' : 'Add'} Clinic</DialogTitle>
                      </DialogHeader>
                      <ClinicForm
                        clinic={editingClinic}
                        onSave={saveClinic}
                        onCancel={() => setEditingClinic(null)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {clinics.map((clinic) => (
                    <Card key={clinic.id}>
                      <CardContent className="flex justify-between items-center p-4">
                        <div>
                          <h4 className="font-semibold">{clinic.name}</h4>
                          <p className="text-sm text-muted-foreground">{clinic.phone}</p>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingClinic(clinic)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Clinic</DialogTitle>
                              </DialogHeader>
                              <ClinicForm
                                clinic={editingClinic}
                                onSave={saveClinic}
                                onCancel={() => setEditingClinic(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clinic.id && deleteClinic(clinic.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Contacts</h3>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingContact({
                        brand_id: selectedBrand,
                        name: '',
                        title: '',
                        contact_type: 'admin',
                        sort_order: 0,
                        is_active: true
                      })}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingContact?.id ? 'Edit' : 'Add'} Contact</DialogTitle>
                      </DialogHeader>
                      <ContactForm
                        contact={editingContact}
                        onSave={saveContact}
                        onCancel={() => setEditingContact(null)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <Card key={contact.id}>
                      <CardContent className="flex justify-between items-center p-4">
                        <div>
                          <h4 className="font-semibold">{contact.name}</h4>
                          <p className="text-sm text-muted-foreground">{contact.title}</p>
                        </div>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingContact(contact)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Contact</DialogTitle>
                              </DialogHeader>
                              <ContactForm
                                contact={editingContact}
                                onSave={saveContact}
                                onCancel={() => setEditingContact(null)}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => contact.id && deleteContact(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClinicForm({ clinic, onSave, onCancel }: {
  clinic: Clinic | null;
  onSave: (clinic: Clinic) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Clinic>(clinic || {
    brand_id: '',
    name: '',
    phone: '',
    address: '',
    fax: '',
    region: 'melbourne',
    extensions: [],
    sort_order: 0,
    is_active: true
  });

  const [extensionInput, setExtensionInput] = useState({ department: '', extension: '' });

  const addExtension = () => {
    if (extensionInput.department && extensionInput.extension) {
      setFormData({
        ...formData,
        extensions: [...formData.extensions, extensionInput]
      });
      setExtensionInput({ department: '', extension: '' });
    }
  };

  const removeExtension = (index: number) => {
    setFormData({
      ...formData,
      extensions: formData.extensions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
      </div>
      <div>
        <Label>Address</Label>
        <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div>
        <Label>Fax</Label>
        <Input value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} />
      </div>
      <div>
        <Label>Region</Label>
        <Select value={formData.region} onValueChange={(value: 'melbourne' | 'regional') => setFormData({ ...formData, region: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="melbourne">Melbourne</SelectItem>
            <SelectItem value="regional">Regional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Extensions</Label>
        <div className="space-y-2">
          {formData.extensions.map((ext, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input value={ext.department} disabled />
              <Input value={ext.extension} disabled className="w-24" />
              <Button variant="outline" size="sm" onClick={() => removeExtension(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Department"
              value={extensionInput.department}
              onChange={(e) => setExtensionInput({ ...extensionInput, department: e.target.value })}
            />
            <Input
              placeholder="Extension"
              value={extensionInput.extension}
              onChange={(e) => setExtensionInput({ ...extensionInput, extension: e.target.value })}
              className="w-24"
            />
            <Button onClick={addExtension}>Add</Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

function ContactForm({ contact, onSave, onCancel }: {
  contact: Contact | null;
  onSave: (contact: Contact) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Contact>(contact || {
    brand_id: '',
    name: '',
    title: '',
    contact_type: 'admin',
    sort_order: 0,
    is_active: true
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div>
        <Label>Title</Label>
        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      </div>
      <div>
        <Label>Phone (Optional)</Label>
        <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
      </div>
      <div>
        <Label>Email (Optional)</Label>
        <Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={formData.contact_type} onValueChange={(value: 'admin' | 'marketing') => setFormData({ ...formData, contact_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}