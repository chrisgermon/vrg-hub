import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Printer, MapPin, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Extension {
  department: string;
  extension: string;
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

// Vision Radiology Directory Data
const visionRadiologyData: DirectoryData = {
  melbourneClinics: [
  {
    name: "Botanic Ridge",
    phone: "03 9998 7455",
    address: "Botanic Ridge Village, Shop 17, 10 Hummingbird Drive, BOTANIC RIDGE VIC 3977",
    fax: "03 9998 7423",
    extensions: [
      { department: "Reception 1", extension: "222" },
      { department: "Reception 2", extension: "220" },
      { department: "Reception 3", extension: "230" },
      { department: "Reception 4 - assistance", extension: "228" },
      { department: "Ultrasound", extension: "223" },
      { department: "CT", extension: "225" },
      { department: "Radiologist", extension: "224" },
    ]
  },
  {
    name: "Carnegie",
    phone: "03 9087 4388",
    address: "90 Koornang Road, CARNEGIE VIC 3163",
    fax: "03 9960 6144",
    extensions: [
      { department: "Reception 1", extension: "131" },
      { department: "Reception 2", extension: "132" },
      { department: "Reception 3", extension: "136" },
      { department: "Ultrasound", extension: "134" },
      { department: "Tech", extension: "135" },
      { department: "Radiologist", extension: "133" },
    ]
  },
  {
    name: "Diamond Creek",
    phone: "03 8657 4933",
    address: "Diamond Creek Plaza, Shop 14, 72 Main Hurstbridge Road, DIAMOND CREEK VIC 3089",
    fax: "03 8657 4937",
    extensions: [
      { department: "Reception 1", extension: "283" },
      { department: "Reception 2", extension: "282" },
      { department: "Reception 3", extension: "281" },
      { department: "Ultrasound", extension: "286" },
      { department: "CT", extension: "285" },
      { department: "Radiologist", extension: "284" },
    ]
  },
  {
    name: "Hampton East",
    phone: "03 9125 0099",
    address: "336-338 South Road, HAMPTON EAST VIC 3188",
    fax: "03 9125 0096",
    extensions: [
      { department: "Reception 1", extension: "231" },
      { department: "Reception 2", extension: "232" },
      { department: "Ultrasound", extension: "233" },
      { department: "MRI", extension: "234" },
      { department: "CT/Tech", extension: "235" },
      { department: "Radiologist", extension: "237" },
    ]
  },
  {
    name: "Lynbrook",
    phone: "03 7065 5811",
    address: "Lynbrook Village Shopping Centre, Shop 34, 75 Lynbrook Boulevard, LYNBROOK VIC 3975",
    fax: "03 7065 5815",
    extensions: [
      { department: "Reception 1", extension: "341" },
      { department: "Reception 2", extension: "342" },
      { department: "Reception 3", extension: "343" },
      { department: "Ultrasound", extension: "345" },
      { department: "CT/Tech", extension: "377" },
      { department: "Radiologist", extension: "346" },
    ]
  },
  {
    name: "Mornington",
    phone: "03 5947 5835",
    address: "947 Nepean Highway, MORNINGTON VIC 3931",
    fax: "03 9957 2282",
    extensions: [
      { department: "Reception 1", extension: "161" },
      { department: "Reception 4", extension: "162" },
      { department: "Reception 2", extension: "226" },
      { department: "Reception 3", extension: "227" },
      { department: "Reception 4", extension: "170" },
      { department: "Reception - Emily", extension: "163" },
      { department: "Ultrasound", extension: "167" },
      { department: "CT", extension: "165" },
      { department: "Xray", extension: "168" },
      { department: "MRI", extension: "169" },
      { department: "Radiologist", extension: "164" },
    ]
  },
  {
    name: "North Melbourne",
    phone: "03 9008 7266",
    address: "257 Flemington Road, NORTH MELBOURNE VIC 3051",
    fax: "03 9008 7274",
    extensions: [
      { department: "Reception 1", extension: "250" },
      { department: "Reception 2", extension: "251" },
      { department: "Ultrasound", extension: "253" },
      { department: "CT", extension: "252" },
      { department: "Radiologist", extension: "254" },
    ]
  },
  {
    name: "Werribee",
    phone: "03 8592 6399",
    address: "5 Bridge Street, WERRIBEE VIC 3030",
    fax: "03 8592 6293",
    extensions: [
      { department: "Reception 1", extension: "270" },
      { department: "Reception 2", extension: "271" },
      { department: "Reception 3", extension: "272" },
      { department: "Reception 4", extension: "276" },
      { department: "CT", extension: "274" },
      { department: "Ultrasound", extension: "275" },
      { department: "Radiologist", extension: "273" },
    ]
  },
  {
    name: "Bulleen",
    phone: "03 9087 4344",
    address: "Bulleen Plaza, Shop 12A, 101 Manningham Road, BULLEEN VIC 3105",
    fax: "03 9960 6143",
    extensions: [
      { department: "Reception 1", extension: "140" },
      { department: "Reception 2", extension: "141" },
      { department: "Reception 3", extension: "142" },
      { department: "Reception 4", extension: "147" },
      { department: "Reception 5", extension: "148" },
      { department: "CT", extension: "145" },
      { department: "MRI", extension: "146" },
      { department: "Tech", extension: "144" },
      { department: "Radiologist", extension: "143" },
    ]
  },
  {
    name: "Coburg",
    phone: "03 9966 3892",
    address: "364 Sydney Road, COBURG VIC 3158",
    fax: "03 9966 3894",
    extensions: [
      { department: "Reception 1", extension: "101" },
      { department: "Reception 2", extension: "103" },
      { department: "Reception 3", extension: "106" },
      { department: "CT", extension: "105" },
      { department: "Radiologist", extension: "104" },
    ]
  },
  {
    name: "Greensborough",
    phone: "03 7044 2077",
    address: "Shop 1a & 2a, 106 Main Street, GREENSBOROUGH VIC 3088",
    fax: "03 7044 2071",
    extensions: [
      { department: "Reception 1", extension: "321" },
      { department: "Reception 2", extension: "322" },
      { department: "CT", extension: "326" },
      { department: "Ultrasound", extension: "325" },
      { department: "Radiologist", extension: "324" },
    ]
  },
  {
    name: "Lilydale",
    phone: "03 8658 0944",
    address: "275 Main Street, LILYDALE VIC 3140",
    fax: "03 8658 0942",
    extensions: [
      { department: "Reception 1", extension: "261" },
      { department: "Reception 2", extension: "262" },
      { department: "Reception 3", extension: "263" },
      { department: "Ultrasound", extension: "265" },
      { department: "CT", extension: "264" },
      { department: "Radiologist", extension: "266" },
    ]
  },
  {
    name: "Mentone",
    phone: "03 8706 4066",
    address: "45-47 Balcombe Road, MENTONE VIC 3130",
    fax: "03 7064 4068",
    extensions: [
      { department: "Reception 1", extension: "331" },
      { department: "Reception 2", extension: "332" },
      { department: "Reception 3", extension: "333" },
      { department: "Ultrasound", extension: "336" },
      { department: "CT", extension: "334" },
      { department: "Radiologist", extension: "335" },
    ]
  },
  {
    name: "Mulgrave",
    phone: "03 9087 4322",
    address: "Mulgrave Business Park, Suite G03, 372 Wellington Road, MULGRAVE VIC 3170",
    fax: "03 9960 6152",
    extensions: [
      { department: "Reception 1", extension: "121" },
      { department: "Reception 2", extension: "122" },
      { department: "Reception 3", extension: "124" },
      { department: "Reception 4 - Admin", extension: "139" },
      { department: "Reception 5 - Admin", extension: "461" },
      { department: "Reception - CTCA", extension: "128" },
      { department: "Ultrasound", extension: "126" },
      { department: "CT", extension: "125" },
      { department: "Radiologist", extension: "123" },
    ]
  },
  {
    name: "Reservoir",
    phone: "03 9118 8246",
    address: "24 Willoughby Street, RESERVOIR VIC 3073",
    fax: "03 9957 8169",
    extensions: [
      { department: "Reception 1", extension: "181" },
      { department: "Reception 2", extension: "182" },
      { department: "Reception 3", extension: "189" },
      { department: "Ultrasound", extension: "185" },
      { department: "MRI", extension: "157" },
      { department: "Tech", extension: "183" },
      { department: "Radiologist", extension: "184" },
    ]
  },
  {
    name: "Thornbury",
    phone: "03 9957 8881",
    address: "621 High Street, THORNBURY VIC 3071",
    fax: "03 9957 8880",
    extensions: [
      { department: "Reception 1", extension: "171" },
      { department: "Reception 2", extension: "172" },
      { department: "CT", extension: "173" },
      { department: "Radiologist", extension: "174" },
    ]
  },
  {
    name: "Williamstown",
    phone: "03 8592 6300",
    address: "Shop 1, 66 Douglas Parade, WILLIAMSTOWN VIC 3016",
    fax: "03 8592 6308",
    extensions: [
      { department: "Reception 1", extension: "311" },
      { department: "Reception 2", extension: "312" },
      { department: "Reception 3", extension: "313" },
      { department: "Reception 4", extension: "317" },
      { department: "CT", extension: "316" },
      { department: "Ultrasound", extension: "314" },
      { department: "Radiologist", extension: "315" },
    ]
  },
],
  regionalClinics: [
  {
    name: "Kangaroo Flat",
    phone: "03 9087 4377",
    address: "99-105 High Street, KANGAROO FLAT VIC 3555",
    fax: "03 9960 6154",
    extensions: [
      { department: "Reception 1", extension: "111" },
      { department: "Reception 2", extension: "112" },
      { department: "Reception 3", extension: "116" },
      { department: "CT", extension: "114" },
      { department: "Tech", extension: "113" },
      { department: "MRI", extension: "117" },
      { department: "Radiologist", extension: "115" },
    ]
  },
  {
    name: "Sebastopol",
    phone: "03 4313 2117",
    address: "43 Albert Street, SEBASTOPOL VIC 3556",
    fax: "03 5947 5033",
    extensions: [
      { department: "Reception 1", extension: "191" },
      { department: "Reception 2", extension: "192" },
      { department: "Reception 3", extension: "193" },
      { department: "CT", extension: "194" },
      { department: "Tech", extension: "195" },
      { department: "Radiologist", extension: "186" },
    ]
  },
  {
    name: "Shepparton",
    phone: "03 9087 4355",
    address: "79A Wyndham Street, SHEPPARTON VIC 3630",
    fax: "03 9978 9406",
    extensions: [
      { department: "Sarah", extension: "201" },
      { department: "Gracie", extension: "202" },
      { department: "Letitia", extension: "206" },
      { department: "Ultrasound", extension: "204" },
      { department: "CT", extension: "203" },
      { department: "MRI", extension: "208" },
      { department: "Radiologist", extension: "205" },
    ]
  },
  {
    name: "Kyabram",
    phone: "03 4831 8533",
    address: "130 Allan Street, KYABRAM VIC 3620",
    fax: "03 4831 8534",
    extensions: [
      { department: "Reception 1", extension: "481" },
      { department: "Reception 2", extension: "482" },
      { department: "Reception 3", extension: "483" },
      { department: "Reception 4", extension: "484" },
      { department: "Reception 5", extension: "485" },
      { department: "Ultrasound", extension: "488" },
      { department: "CT", extension: "486" },
      { department: "Radiologist", extension: "487" },
    ]
  },
  {
    name: "Torquay",
    phone: "03 5292 9911",
    address: "Torquay Medical Hub, Suite G06, 1 Cylinders Drive, TORQUAY VIC 3228",
    fax: "03 5292 9913",
    extensions: [
      { department: "Reception 1", extension: "211" },
      { department: "Reception 2", extension: "212" },
      { department: "Reception 3", extension: "213" },
      { department: "CT", extension: "214" },
      { department: "US", extension: "215" },
      { department: "MRI", extension: "216" },
      { department: "Radiologist", extension: "217" },
    ]
  },
  {
    name: "Colac",
    phone: "03 5208 9055",
    address: "Shop 3, 118-128 Bromfield Street, COLAC VIC 3250",
    fax: "03 5208 9056",
    extensions: [
      { department: "Reception 1", extension: "511" },
      { department: "Reception 2", extension: "512" },
      { department: "Reception 3", extension: "513" },
      { department: "Reception 4", extension: "517" },
      { department: "Ultrasound", extension: "514" },
      { department: "CT", extension: "516" },
      { department: "Radiologist", extension: "515" },
    ]
  },
],
  adminContacts: [
  { name: "Slav Kotevski", title: "Radiology Workflow Manager" },
  { name: "Carol Rizkallah", title: "Clinical Support Manager" },
  { name: "Claire Brewer", title: "South East Regional Manager" },
],
  marketingContacts: [
  { name: "Lauren Moutafis", title: "Head of Marketing" },
  { name: "Megan Smythe", title: "Customer Relationship Representative" },
  { name: "Danielle Jensen", title: "Customer Relationship Representative" },
  { name: "Suella Panagiotou", title: "Customer Relationship Representative" },
  { name: "Kristina Bilic", title: "Customer Relationship Representative" },
  { name: "Baylee Yanner", title: "Customer Relationship Representative" },
]
};

// Quantum Medical Imaging Directory Data
const quantumMedicalImagingData: DirectoryData = {
  melbourneClinics: [
    {
      name: "QMI Melbourne CBD",
      phone: "03 XXXX XXXX",
      address: "Address to be updated",
      fax: "03 XXXX XXXX",
      extensions: [
        { department: "Reception", extension: "XXX" },
      ]
    },
  ],
  regionalClinics: [],
  adminContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ],
  marketingContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ]
};

// Light Radiology Directory Data
const lightRadiologyData: DirectoryData = {
  melbourneClinics: [
    {
      name: "Light Radiology Location",
      phone: "03 XXXX XXXX",
      address: "Address to be updated",
      fax: "03 XXXX XXXX",
      extensions: [
        { department: "Reception", extension: "XXX" },
      ]
    },
  ],
  regionalClinics: [],
  adminContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ],
  marketingContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ]
};

// Focus Radiology Directory Data
const focusRadiologyData: DirectoryData = {
  melbourneClinics: [
    {
      name: "Focus Radiology Location",
      phone: "03 XXXX XXXX",
      address: "Address to be updated",
      fax: "03 XXXX XXXX",
      extensions: [
        { department: "Reception", extension: "XXX" },
      ]
    },
  ],
  regionalClinics: [],
  adminContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ],
  marketingContacts: [
    { name: "Contact Name", title: "Title to be updated" },
  ]
};

// Map brand names to directory data
const brandDirectoryMap: Record<string, DirectoryData> = {
  'vr': visionRadiologyData,
  'qmi': quantumMedicalImagingData,
  'lr': lightRadiologyData,
  'fr': focusRadiologyData,
};

export default function CompanyDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('vr');
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, display_name, logo_url')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data && !error) {
        setBrands(data);
      }
      setIsLoadingBrands(false);
    };

    fetchBrands();
  }, []);

  const currentDirectoryData = brandDirectoryMap[selectedBrand] || visionRadiologyData;

  const filterClinics = (clinics: Clinic[]) => {
    if (!searchQuery) return clinics;
    
    const query = searchQuery.toLowerCase();
    return clinics.filter(clinic => 
      clinic.name.toLowerCase().includes(query) ||
      clinic.address.toLowerCase().includes(query) ||
      clinic.phone.includes(query) ||
      clinic.extensions.some(ext => 
        ext.department.toLowerCase().includes(query) ||
        ext.extension.includes(query)
      )
    );
  };

  const filteredMelbourneClinics = useMemo(
    () => filterClinics(currentDirectoryData.melbourneClinics), 
    [searchQuery, selectedBrand]
  );
  const filteredRegionalClinics = useMemo(
    () => filterClinics(currentDirectoryData.regionalClinics), 
    [searchQuery, selectedBrand]
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
    () => filterContacts(currentDirectoryData.adminContacts), 
    [searchQuery, selectedBrand]
  );
  const filteredMarketingContacts = useMemo(
    () => filterContacts(currentDirectoryData.marketingContacts), 
    [searchQuery, selectedBrand]
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-4">Phone Directory</h1>
          <p className="text-muted-foreground">Select a brand to view their contact directory</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-64">
            <label className="text-sm font-medium mb-2 block">Select Brand</label>
            <Select 
              value={selectedBrand} 
              onValueChange={setSelectedBrand}
              disabled={isLoadingBrands}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.name}>
                    {brand.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 w-full">
            <label className="text-sm font-medium mb-2 block">Search Directory</label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by clinic, department, extension, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
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
              <div key={ext.department} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{ext.department}</span>
                <Badge variant="outline" className="text-xs">{ext.extension}</Badge>
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
