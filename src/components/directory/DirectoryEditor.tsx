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
  name: string;
  number: string;
}

interface Clinic {
  id?: string;
  brand_id: string;
  name: string;
  phone: string;
  address: string;
  fax: string;
  region: 'melbourne' | 'regional';
  category_id: string;
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
  category_id: string;
  sort_order: number;
  is_active: boolean;
}

interface DirectoryCategory {
  id?: string;
  brand_id: string;
  name: string;
  category_type: 'clinic' | 'contact';
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
  const [selectedBrand, setSelectedBrand] = useState('');
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingCategory, setEditingCategory] = useState<DirectoryCategory | null>(null);

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
    
    const [categoriesRes, clinicsRes, contactsRes] = await Promise.all([
      supabase
        .from('directory_categories')
        .select('*')
        .eq('brand_id', selectedBrand)
        .order('sort_order'),
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

    if (categoriesRes.data) {
      setCategories(categoriesRes.data.map(c => ({
        ...c,
        category_type: c.category_type as 'clinic' | 'contact'
      })));
    }
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

  const saveCategory = async (category: DirectoryCategory) => {
    const { error } = category.id
      ? await supabase.from('directory_categories').update(category).eq('id', category.id)
      : await supabase.from('directory_categories').insert([category]);

    if (error) {
      toast.error('Failed to save category');
      console.error(error);
    } else {
      toast.success('Category saved successfully');
      fetchData();
      setEditingCategory(null);
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('directory_categories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted successfully');
      fetchData();
    }
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
      console.error(error);
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
      : await supabase.from('directory_contacts').insert([contact]);

    if (error) {
      toast.error('Failed to save contact');
      console.error(error);
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

  const clinicCategories = categories.filter(c => c.category_type === 'clinic');
  const contactCategories = categories.filter(c => c.category_type === 'contact');

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Brand</Label>
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger>
            <SelectValue placeholder="Select brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map(brand => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrand && (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="clinics">Clinics</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Categories</h3>
              <Dialog open={editingCategory !== null && !editingCategory?.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingCategory({
                    brand_id: selectedBrand,
                    name: '',
                    category_type: 'clinic',
                    sort_order: categories.length,
                    is_active: true
                  })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                  </DialogHeader>
                  {editingCategory && (
                    <CategoryForm
                      category={editingCategory}
                      onSave={saveCategory}
                      onCancel={() => setEditingCategory(null)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Clinic Categories</h4>
              {clinicCategories.map(category => (
                <Card key={category.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingCategory(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          {editingCategory && editingCategory.id === category.id && (
                            <CategoryForm
                              category={editingCategory}
                              onSave={saveCategory}
                              onCancel={() => setEditingCategory(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => category.id && deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}

              <h4 className="font-medium mt-4">Contact Categories</h4>
              {contactCategories.map(category => (
                <Card key={category.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{category.name}</CardTitle>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingCategory(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          {editingCategory && editingCategory.id === category.id && (
                            <CategoryForm
                              category={editingCategory}
                              onSave={saveCategory}
                              onCancel={() => setEditingCategory(null)}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => category.id && deleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="clinics" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Clinics</h3>
              <Dialog open={editingClinic !== null && !editingClinic?.id} onOpenChange={(open) => !open && setEditingClinic(null)}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingClinic({
                    brand_id: selectedBrand,
                    name: '',
                    phone: '',
                    address: '',
                    fax: '',
                    region: 'melbourne',
                    category_id: clinicCategories[0]?.id || '',
                    extensions: [],
                    sort_order: clinics.length,
                    is_active: true
                  })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Clinic
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Clinic</DialogTitle>
                  </DialogHeader>
                  {editingClinic && (
                    <ClinicForm
                      clinic={editingClinic}
                      categories={clinicCategories}
                      onSave={saveClinic}
                      onCancel={() => setEditingClinic(null)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {clinics.map(clinic => (
                <Card key={clinic.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{clinic.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{clinic.phone}</p>
                        <p className="text-xs text-muted-foreground">
                          Category: {categories.find(c => c.id === clinic.category_id)?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingClinic(clinic)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Clinic</DialogTitle>
                            </DialogHeader>
                            {editingClinic && editingClinic.id === clinic.id && (
                              <ClinicForm
                                clinic={editingClinic}
                                categories={clinicCategories}
                                onSave={saveClinic}
                                onCancel={() => setEditingClinic(null)}
                              />
                            )}
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
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Contacts</h3>
              <Dialog open={editingContact !== null && !editingContact?.id} onOpenChange={(open) => !open && setEditingContact(null)}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingContact({
                    brand_id: selectedBrand,
                    name: '',
                    title: '',
                    contact_type: 'admin',
                    category_id: contactCategories[0]?.id || '',
                    sort_order: contacts.length,
                    is_active: true
                  })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Contact</DialogTitle>
                  </DialogHeader>
                  {editingContact && (
                    <ContactForm
                      contact={editingContact}
                      categories={contactCategories}
                      onSave={saveContact}
                      onCancel={() => setEditingContact(null)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {contacts.map(contact => (
                <Card key={contact.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{contact.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Category: {categories.find(c => c.id === contact.category_id)?.name || 'N/A'}
                        </p>
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
                            {editingContact && editingContact.id === contact.id && (
                              <ContactForm
                                contact={editingContact}
                                categories={contactCategories}
                                onSave={saveContact}
                                onCancel={() => setEditingContact(null)}
                              />
                            )}
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
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  onSave,
  onCancel,
}: {
  category: DirectoryCategory;
  onSave: (category: DirectoryCategory) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(category);

  return (
    <div className="space-y-4">
      <div>
        <Label>Category Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Melbourne Clinics"
        />
      </div>

      <div>
        <Label>Category Type</Label>
        <Select
          value={formData.category_type}
          onValueChange={(value: 'clinic' | 'contact') =>
            setFormData({ ...formData, category_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clinic">Clinic</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
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

function ClinicForm({
  clinic,
  categories,
  onSave,
  onCancel,
}: {
  clinic: Clinic;
  categories: DirectoryCategory[];
  onSave: (clinic: Clinic) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Clinic>(clinic);
  const [extensionInput, setExtensionInput] = useState({ name: '', number: '' });

  const addExtension = () => {
    if (extensionInput.name && extensionInput.number) {
      setFormData({
        ...formData,
        extensions: [...formData.extensions, extensionInput]
      });
      setExtensionInput({ name: '', number: '' });
    }
  };

  const removeExtension = (index: number) => {
    setFormData({
      ...formData,
      extensions: formData.extensions.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <Label>Category</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => setFormData({ ...formData, category_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Clinic Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <Label>Fax</Label>
        <Input
          value={formData.fax}
          onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
        />
      </div>

      <div>
        <Label>Extensions</Label>
        <div className="space-y-2">
          {formData.extensions.map((ext, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input value={ext.name} disabled />
              <Input value={ext.number} disabled className="w-24" />
              <Button variant="outline" size="sm" onClick={() => removeExtension(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Name (e.g. Reception 1)"
              value={extensionInput.name}
              onChange={(e) => setExtensionInput({ ...extensionInput, name: e.target.value })}
            />
            <Input
              placeholder="Number"
              value={extensionInput.number}
              onChange={(e) => setExtensionInput({ ...extensionInput, number: e.target.value })}
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

function ContactForm({
  contact,
  categories,
  onSave,
  onCancel,
}: {
  contact: Contact;
  categories: DirectoryCategory[];
  onSave: (contact: Contact) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState(contact);

  return (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Select
          value={formData.category_id}
          onValueChange={(value) => setFormData({ ...formData, category_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id!}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <Label>Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <Label>Phone (optional)</Label>
        <Input
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div>
        <Label>Email (optional)</Label>
        <Input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
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
