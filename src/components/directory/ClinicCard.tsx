import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Printer, MapPin } from 'lucide-react';
import { Clinic } from '@/types/directory';

interface ClinicCardProps {
  clinic: Clinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
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

        {clinic.extensions.length > 0 && (
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
        )}
      </CardContent>
    </Card>
  );
}
