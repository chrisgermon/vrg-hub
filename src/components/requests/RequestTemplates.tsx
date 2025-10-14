import React, { useState, useEffect } from 'react';
import { Plus, Laptop, Monitor, Phone, Printer, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface RequestTemplate {
  id: string;
  name: string;
  description: string;
  category: 'laptop' | 'desktop' | 'mobile' | 'printer' | 'accessories' | 'software';
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    estimated_price?: number;
    vendor?: string;
    model_number?: string;
  }>;
  estimated_total: number;
  justification_template: string;
}

interface RequestTemplatesProps {
  onSelectTemplate: (template: RequestTemplate) => void;
}

export function RequestTemplates({ onSelectTemplate }: RequestTemplatesProps) {
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Default templates - in a real app, these would come from the database
  const defaultTemplates: RequestTemplate[] = [
    {
      id: '1',
      name: 'MacBook Pro Development Setup',
      description: 'Complete development workstation for software engineers',
      category: 'laptop',
      items: [
        {
          name: 'MacBook Pro 16-inch',
          description: 'M3 Pro chip, 32GB RAM, 1TB SSD',
          quantity: 1,
          estimated_price: 3999,
          vendor: 'Apple',
          model_number: 'MK1E3LL/A'
        },
        {
          name: 'USB-C Hub',
          description: 'Multi-port adapter with HDMI, USB-A, and SD card reader',
          quantity: 1,
          estimated_price: 79,
          vendor: 'Belkin'
        }
      ],
      estimated_total: 4078,
      justification_template: 'Required for software development work including mobile app development, web applications, and handling large codebases. The performance and reliability improvements will increase productivity significantly.'
    },
    {
      id: '2',
      name: 'Standard Office Workstation',
      description: 'Basic desktop setup for office work',
      category: 'desktop',
      items: [
        {
          name: 'Dell OptiPlex Desktop',
          description: 'Intel i5, 16GB RAM, 512GB SSD',
          quantity: 1,
          estimated_price: 899,
          vendor: 'Dell',
          model_number: 'OptiPlex-7010'
        },
        {
          name: '24-inch Monitor',
          description: 'Full HD 1080p display',
          quantity: 1,
          estimated_price: 249,
          vendor: 'Dell'
        },
        {
          name: 'Wireless Keyboard & Mouse',
          description: 'Ergonomic wireless combo',
          quantity: 1,
          estimated_price: 89,
          vendor: 'Logitech'
        }
      ],
      estimated_total: 1237,
      justification_template: 'Standard workstation required for daily office tasks, document processing, email communication, and basic business applications.'
    },
    {
      id: '3',
      name: 'iPhone Business Package',
      description: 'Company phone with accessories',
      category: 'mobile',
      items: [
        {
          name: 'iPhone 15 Pro',
          description: '256GB, Space Black',
          quantity: 1,
          estimated_price: 1199,
          vendor: 'Apple',
          model_number: 'MTUX3LL/A'
        },
        {
          name: 'Protective Case',
          description: 'Rugged case with screen protector',
          quantity: 1,
          estimated_price: 49,
          vendor: 'OtterBox'
        },
        {
          name: 'Wireless Charger',
          description: 'MagSafe compatible charging pad',
          quantity: 1,
          estimated_price: 39,
          vendor: 'Apple'
        }
      ],
      estimated_total: 1287,
      justification_template: 'Business mobile device required for communication, email access, video calls, and mobile productivity applications while traveling or working remotely.'
    },
    {
      id: '4',
      name: 'Office Printer Setup',
      description: 'Multi-function printer with supplies',
      category: 'printer',
      items: [
        {
          name: 'HP LaserJet Pro MFP',
          description: 'Print, scan, copy, fax functionality',
          quantity: 1,
          estimated_price: 399,
          vendor: 'HP',
          model_number: 'M428fdn'
        },
        {
          name: 'Toner Cartridge Set',
          description: 'High-yield black toner cartridges (2-pack)',
          quantity: 1,
          estimated_price: 189,
          vendor: 'HP'
        }
      ],
      estimated_total: 588,
      justification_template: 'Multi-function printer required for document processing, contract printing, scanning physical documents, and general office printing needs.'
    },
    {
      id: '5',
      name: 'Remote Work Accessories',
      description: 'Essential accessories for remote work setup',
      category: 'accessories',
      items: [
        {
          name: 'Webcam HD 1080p',
          description: 'High-quality camera for video conferencing',
          quantity: 1,
          estimated_price: 129,
          vendor: 'Logitech',
          model_number: 'C920'
        },
        {
          name: 'Noise-Cancelling Headphones',
          description: 'Over-ear headphones with microphone',
          quantity: 1,
          estimated_price: 299,
          vendor: 'Bose',
          model_number: 'QC45'
        },
        {
          name: 'Ergonomic Office Chair',
          description: 'Adjustable lumbar support, breathable mesh',
          quantity: 1,
          estimated_price: 349,
          vendor: 'Herman Miller'
        }
      ],
      estimated_total: 777,
      justification_template: 'Essential ergonomic and technical equipment for productive remote work, ensuring proper posture, clear communication during video calls, and professional appearance in meetings.'
    }
  ];

  useEffect(() => {
    setTemplates(defaultTemplates);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'laptop': return <Laptop className="w-5 h-5" />;
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'mobile': return <Phone className="w-5 h-5" />;
      case 'printer': return <Printer className="w-5 h-5" />;
      case 'accessories': return <Package className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'laptop', name: 'Laptops' },
    { id: 'desktop', name: 'Desktops' },
    { id: 'mobile', name: 'Mobile' },
    { id: 'printer', name: 'Printers' },
    { id: 'accessories', name: 'Accessories' }
  ];

  const handleSelectTemplate = (template: RequestTemplate) => {
    onSelectTemplate(template);
    toast({
      title: "Template Applied",
      description: `"${template.name}" template has been applied to your request.`,
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="mb-4">
          <Package className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Items Preview */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Items ({template.items.length})</h4>
                    <div className="space-y-1">
                      {template.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex justify-between">
                          <span>{item.name}</span>
                          <span>×{item.quantity}</span>
                        </div>
                      ))}
                      {template.items.length > 3 && (
                        <div className="text-sm text-muted-foreground">
                          +{template.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimated Total */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium">Estimated Total:</span>
                    <span className="font-medium text-lg">${template.estimated_total.toFixed(2)}</span>
                  </div>

                  {/* Use Template Button */}
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectTemplate(template)}
                    variant="premium"
                    size="default"
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No templates found for the selected category.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}