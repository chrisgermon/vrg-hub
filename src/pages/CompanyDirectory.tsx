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
  name: string;
  phone: string;
  address: string;
  fax: string;
  extensions: Extension[];
}

interface Contact {
  name: string;
  title: string;
  phone?: string;
  email?: string;
}

interface Brand {
  id: string;
  name: string;
  display_name: string;
  logo_url: string | null;
}

interface DirectoryData {
  melbourneClinics: Clinic[];
  regionalClinics: Clinic[];
  adminContacts: Contact[];
  marketingContacts: Contact[];
}

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [melbourneClinics, setMelbourneClinics] = useState<Clinic[]>([]);
  const [regionalClinics, setRegionalClinics] = useState<Clinic[]>([]);
  const [adminContacts, setAdminContacts] = useState<Contact[]>([]);
  const [marketingContacts, setMarketingContacts] = useState<Contact[]>([]);
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

    const [clinicsRes, contactsRes] = await Promise.all([
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

    if (clinicsRes.data) {
      const melbourne = clinicsRes.data
        .filter((c: any) => c.region === 'melbourne')
        .map((c: any) => ({
          name: c.name,
          phone: c.phone,
          address: c.address,
          fax: c.fax,
          extensions: (c.extensions || []) as Extension[]
        }));
      
      const regional = clinicsRes.data
        .filter((c: any) => c.region === 'regional')
        .map((c: any) => ({
          name: c.name,
          phone: c.phone,
          address: c.address,
          fax: c.fax,
          extensions: (c.extensions || []) as Extension[]
        }));
      
      setMelbourneClinics(melbourne);
      setRegionalClinics(regional);
    }
    
    if (contactsRes.data) {
      const admin = contactsRes.data
        .filter((c: any) => c.contact_type === 'admin')
        .map((c: any) => ({
          name: c.name,
          title: c.title,
          phone: c.phone,
          email: c.email
        }));
      
      const marketing = contactsRes.data
        .filter((c: any) => c.contact_type === 'marketing')
        .map((c: any) => ({
          name: c.name,
          title: c.title,
          phone: c.phone,
          email: c.email
        }));
      
      setAdminContacts(admin);
      setMarketingContacts(marketing);
    }
    setIsLoadingData(false);
  };

  const filterClinics = (clinics: Clinic[]) => {
    if (!searchQuery) return clinics;
    
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

  const filteredMelbourneClinics = useMemo(
    () => filterClinics(melbourneClinics), 
    [searchQuery, melbourneClinics]
  );
  const filteredRegionalClinics = useMemo(
    () => filterClinics(regionalClinics), 
    [searchQuery, regionalClinics]
  );

  const filterContacts = (contacts: Contact[]) => {
    if (!searchQuery) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query) ||
      contact.title.toLowerCase().includes(query)
    );
  };

  const filteredAdminContacts = useMemo(
    () => filterContacts(adminContacts), 
    [searchQuery, adminContacts]
  );
  const filteredMarketingContacts = useMemo(
    () => filterContacts(marketingContacts), 
    [searchQuery, marketingContacts]
  );

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

      <Tabs defaultValue="melbourne" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="melbourne">Melbourne</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="melbourne" className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Melbourne Clinics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMelbourneClinics.map((clinic) => (
              <ClinicCard key={clinic.name} clinic={clinic} />
            ))}
          </div>
          {filteredMelbourneClinics.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No results found</p>
          )}
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Regional Clinics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRegionalClinics.map((clinic) => (
              <ClinicCard key={clinic.name} clinic={clinic} />
            ))}
          </div>
          {filteredRegionalClinics.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No results found</p>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Admin Contacts</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAdminContacts.map((contact) => (
                <ContactCard key={contact.name} contact={contact} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Marketing and Sales Contacts</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMarketingContacts.map((contact) => (
                <ContactCard key={contact.name} contact={contact} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Referrer Support</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">For referrer support inquiries</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Support Services</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Crowd IT Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Contact Number:</span>
                <a href="tel:0383305755" className="text-primary hover:underline">03 8330 5755</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Email:</span>
                <a href="mailto:support@crowdit.com.au" className="text-primary hover:underline">support@crowdit.com.au</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Portal:</span>
                <a href="https://support.crowdit.com.au/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://support.crowdit.com.au/</a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zed Technologies - Patient Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="destructive" className="mb-2">DO NOT GIVE THIS NUMBER TO PATIENTS</Badge>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Contact Number:</span>
                <a href="tel:1300662980" className="text-primary hover:underline">1300 662 980</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">Email:</span>
                <a href="mailto:support@zedtechnologies.com.au" className="text-primary hover:underline">support@zedtechnologies.com.au</a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
            {clinic.extensions.map((ext) => (
              <div key={ext.name} className="flex justify-between text-xs">
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{contact.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{contact.title}</p>
        {contact.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
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
