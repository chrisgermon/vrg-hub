import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanyLogoUpload } from '@/components/CompanyLogoUpload';
import ColorSchemeManager from '@/components/settings/ColorSchemeManager';
import { CompanyRequestPrefixManager } from '@/components/settings/CompanyRequestPrefixManager';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { formatAUDate } from '@/lib/dateUtils';

interface CompanySettingsProps {
  company: {
    id: string;
    name: string;
    slug: string;
    subdomain?: string | null;
    logo_url?: string | null;
    background_image_url?: string | null;
    billing_contact_email?: string | null;
    approval_emails?: string[] | null;
    company_domains?: Array<{
      domain: string;
      active: boolean;
    }>;
    created_at: string;
    updated_at: string;
    active: boolean;
  };
  onLogoUpdated?: (logoUrl: string | null) => void;
}

export function CompanySettings({ company, onLogoUpdated }: CompanySettingsProps) {
  return (
    <div className="space-y-6">
      {/* Logo Upload and Company Details Side by Side */}
      <div className="grid gap-6 md:grid-cols-2">
        <CompanyLogoUpload
          companyId={company.id}
          currentLogoUrl={company.logo_url}
          onLogoUpdated={onLogoUpdated}
        />

        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Company Name</Label>
              <p className="text-sm text-muted-foreground">{company.name}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Slug</Label>
              <p className="text-sm text-muted-foreground">{company.slug}</p>
            </div>

            {company.subdomain && (
              <div>
                <Label className="text-sm font-medium">Subdomain</Label>
                <p className="text-sm text-muted-foreground">{company.subdomain}</p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                <Badge variant={company.active ? 'success' : 'secondary'}>
                  {company.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm text-muted-foreground">
                {formatAUDate(company.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Email Domains */}
        {company.company_domains && company.company_domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Email Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {company.company_domains.map((domain, index) => (
                  <Badge key={index} variant="outline">
                    {domain.domain}
                    {domain.active && <span className="ml-1 text-emerald-600">✓</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.billing_contact_email && (
              <div>
                <Label className="text-sm font-medium">Billing Contact</Label>
                <p className="text-sm text-muted-foreground">{company.billing_contact_email}</p>
              </div>
            )}

            {company.approval_emails && company.approval_emails.length > 0 && (
              <div>
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Approval Emails
                </Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {company.approval_emails.map((email: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Number Prefix */}
      <CompanyRequestPrefixManager companyId={company.id} />

      {/* Colour Scheme Settings */}
      <ColorSchemeManager companyId={company.id} />
    </div>
  );
}