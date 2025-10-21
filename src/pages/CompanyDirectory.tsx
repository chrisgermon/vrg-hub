import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Printer, MapPin, Mail, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DirectoryEditor from '@/components/directory/DirectoryEditor';

interface Extension {
  name: string;
  number: string;
}

interface Clinic {
  id: string;
  name: string;
  phone: string;
  address: string;
  fax: string;
  extensions: Extension[];
  category_id: string;
}

interface Contact {
  id: string;
  name: string;
  title: string;
  phone?: string;
  email?: string;
  category_id: string;
}

interface Brand {
  id: string;
  name: string;
  display_name: string;
  logo_url: string | null;
}

interface DirectoryCategory {
  id: string;
  name: string;
  category_type: 'clinic' | 'contact';
  sort_order: number;
}

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const { userRole } = useAuth();
  const isAdmin = userRole === 'tenant_admin' || userRole === 'super_admin';

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, display_name, logo_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data && !error) {
        setBrands(data);
        if (data.length > 0) setSelectedBrand(data[0].name);
      }
      setIsLoadingBrands(false);
    };

    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchDirectoryData();
    }
  }, [selectedBrand, brands]);

  const fetchDirectoryData = async () => {
    setIsLoadingData(true);
    const brand = brands.find(b => b.name === selectedBrand);
    if (!brand) {
      setIsLoadingData(false);
      return;
    }

    const [categoriesRes, clinicsRes, contactsRes] = await Promise.all([
      supabase
        .from('directory_categories')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('directory_clinics')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('directory_contacts')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('is_active', true)
        .order('sort_order')
    ]);

    if (categoriesRes.data) {
      setCategories(categoriesRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        category_type: c.category_type as 'clinic' | 'contact',
        sort_order: c.sort_order
      })));
    }

    if (clinicsRes.data) {
      setClinics(clinicsRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        fax: c.fax,
        extensions: (c.extensions || []) as Extension[],
        category_id: c.category_id
      })));
    }

    if (contactsRes.data) {
      setContacts(contactsRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        title: c.title,
        phone: c.phone,
        email: c.email,
        category_id: c.category_id
      })));
    }

    setIsLoadingData(false);
  };

  const getClinicsByCategory = (categoryId: string) => {
    return clinics.filter(c => c.category_id === categoryId);
  };

  const getContactsByCategory = (categoryId: string) => {
    return contacts.filter(c => c.category_id === categoryId);
  };

  const filterClinics = (clinics: Clinic[]) => {
    if (!searchQuery.trim()) return clinics;
    
    const query = searchQuery.toLowerCase();
    return clinics.filter(clinic => 
      clinic.name.toLowerCase().includes(query) ||
      clinic.address.toLowerCase().includes(query) ||
      clinic.phone.includes(query) ||
      clinic.extensions.some(ext => 
        ext.name.toLowerCase().includes(query) ||
        ext.number.includes(query)
      )
    );
  };

  const filterContacts = (contacts: Contact[]) => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.title.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  };

  const clinicCategories = categories.filter(c => c.category_type === 'clinic');
  const contactCategories = categories.filter(c => c.category_type === 'contact');
  const defaultTab = categories.length > 0 ? categories[0].id : '';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-4">Phone Directory</h1>
            <p className="text-muted-foreground">Select a brand to view their contact directory</p>
          </div>
          {isAdmin && (
            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Directory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Directory Editor</DialogTitle>
                </DialogHeader>
                <DirectoryEditor />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Brand Logo Selector */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
          {isLoadingBrands ? (
            <div className="text-sm text-muted-foreground">Loading brands...</div>
          ) : (
            brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrand(brand.name)}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md w-40 h-28 flex items-center justify-center ${
                  selectedBrand === brand.name
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                title={brand.display_name}
              >
                <img
                  src={brand.logo_url || ''}
                  alt={brand.display_name}
                  className="max-h-20 max-w-full object-contain"
                />
              </button>
            ))
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by clinic, department, extension, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No directory categories found for this brand.</p>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">
              Click "Edit Directory" to add categories and entries.
            </p>
          )}
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {clinicCategories.map((category) => {
            const categoryClinicsList = getClinicsByCategory(category.id);
            const filteredClinics = filterClinics(categoryClinicsList);
            
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-4">
                <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClinics.map((clinic) => (
                    <ClinicCard key={clinic.id} clinic={clinic} />
                  ))}
                </div>
                {filteredClinics.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? 'No results found' : 'No clinics in this category'}
                  </p>
                )}
              </TabsContent>
            );
          })}

          {contactCategories.map((category) => {
            const categoryContactsList = getContactsByCategory(category.id);
            const filteredContactsList = filterContacts(categoryContactsList);
            
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-4">
                <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredContactsList.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
                {filteredContactsList.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    {searchQuery ? 'No results found' : 'No contacts in this category'}
                  </p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function ClinicCard({ clinic }: { clinic: Clinic }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{clinic.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
              {clinic.phone}
            </a>
          </div>
          
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground text-xs">{clinic.address}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <Printer className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground text-xs">{clinic.fax}</span>
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="font-semibold text-xs mb-2 text-muted-foreground uppercase">Extensions</h4>
          <div className="grid grid-cols-2 gap-2">
            {clinic.extensions.map((ext, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{ext.name}</span>
                <Badge variant="outline" className="text-xs">{ext.number}</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{contact.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{contact.title}</p>
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
              {contact.email}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
