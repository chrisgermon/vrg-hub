import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Brand, DirectoryCategory, Clinic, Contact } from '@/types/directory';
import { CategoryForm } from './forms/CategoryForm';
import { ClinicForm } from './forms/ClinicForm';
import { ContactForm } from './forms/ContactForm';

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
    
    try {
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

      if (categoriesRes.error) throw categoriesRes.error;
      if (clinicsRes.error) throw clinicsRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setCategories((categoriesRes.data || []).map(c => ({
        ...c,
        category_type: c.category_type as 'clinic' | 'contact'
      })));
      setClinics((clinicsRes.data || []).map(c => ({
        ...c,
        extensions: c.extensions as any as import('@/types/directory').Extension[]
      })));
      setContacts(contactsRes.data || []);
    } catch (error) {
      console.error('Error fetching directory data:', error);
      toast.error('Failed to load directory data');
    } finally {
      setIsLoading(false);
    }
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
    try {
      const clinicData = { 
        ...clinic, 
        extensions: clinic.extensions as any,
        region: clinic.region || 'melbourne'
      };
      const { error } = clinic.id
        ? await supabase.from('directory_clinics').update(clinicData).eq('id', clinic.id)
        : await supabase.from('directory_clinics').insert([clinicData]);

      if (error) throw error;
      
      toast.success('Clinic saved successfully');
      fetchData();
      setEditingClinic(null);
    } catch (error) {
      console.error('Error saving clinic:', error);
      toast.error('Failed to save clinic');
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
    const contactData = {
      ...contact,
      contact_type: contact.contact_type || 'admin'
    };
    const { error } = contact.id
      ? await supabase.from('directory_contacts').update(contactData).eq('id', contact.id)
      : await supabase.from('directory_contacts').insert([contactData]);

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
        <Label>Select Company</Label>
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
