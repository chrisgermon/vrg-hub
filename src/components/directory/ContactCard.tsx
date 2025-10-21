import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail } from 'lucide-react';
import { Contact } from '@/types/directory';

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
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
