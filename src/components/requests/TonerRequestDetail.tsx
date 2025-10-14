import React, { useState, useEffect } from 'react';
import { formatAUDate } from '@/lib/dateUtils';
import { Printer, Calendar, MapPin, Package, AlertCircle, CheckCircle2, Link as LinkIcon, MessageSquare, FileText, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmailLogs } from './EmailLogs';
import { RequestActivity } from './RequestActivity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TonerRequest {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  site?: string;
  printer_model?: string;
  colors_required?: string[];
  urgency: string;
  status: string;
  predicted_toner_models?: string;
  eta_delivery?: string;
  tracking_link?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
  user_id: string;
  company_id: string;
}

interface TonerRequestDetailProps {
  requestId: string;
}

export function TonerRequestDetail({ requestId }: TonerRequestDetailProps) {
  const [request, setRequest] = useState<TonerRequest | null>(null);
  const [requesterName, setRequesterName] = useState<string>('');
  const [requesterEmail, setRequesterEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    try {
      // Fetch toner request
      const { data: requestData, error: requestError } = await supabase
        .from('toner_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;
      if (!requestData) {
        toast({
          title: 'Error',
          description: 'Request not found',
          variant: 'destructive',
        });
        return;
      }

      setRequest(requestData);

      // Fetch requester profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', requestData.user_id)
        .single();

      if (profileData) {
        setRequesterName(profileData.name || '');
        setRequesterEmail(profileData.email || '');
      }

      // Fetch company name
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', requestData.company_id)
        .single();

      if (companyData) {
        setCompanyName(companyData.name);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load request details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode }> = {
      submitted: { variant: 'default', icon: <AlertCircle className="w-3 h-3" /> },
      completed: { variant: 'secondary', icon: <CheckCircle2 className="w-3 h-3" /> },
    };

    const { variant, icon } = variants[status] || { variant: 'outline', icon: null };

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      normal: 'secondary',
      urgent: 'default',
      critical: 'destructive',
    };

    return (
      <Badge variant={variants[urgency] || 'outline'}>
        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading request details...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!request) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Request not found</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                {(request as any).request_number && (
                  <code className="text-sm font-mono bg-muted px-3 py-1 rounded border">
                    {(request as any).request_number}
                  </code>
                )}
                <CardTitle className="text-2xl">{request.title}</CardTitle>
                {(request as any).from_email && (
                  <Badge variant="outline" className="gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Request
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(request.status)}
                {getUrgencyBadge(request.urgency)}
              </div>
            </div>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Requester Info
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-6 max-h-[600px] overflow-y-auto" align="end">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Request Information</h3>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Requester Information</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium">{requesterName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{requesterEmail || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="text-sm font-medium">{companyName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="text-sm font-medium">{formatAUDate(request.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {request.status === 'completed' && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Order Information</h4>
                      <div className="space-y-2">
                        {request.eta_delivery && (
                          <div className="flex items-start gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">ETA Delivery</p>
                              <p className="text-sm font-medium">{formatAUDate(request.eta_delivery)}</p>
                            </div>
                          </div>
                        )}
                        {request.tracking_link && (
                          <div className="flex items-start gap-2">
                            <LinkIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Tracking</p>
                              <a 
                                href={request.tracking_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                View Tracking
                              </a>
                            </div>
                          </div>
                        )}
                        {request.completed_at && (
                          <div>
                            <p className="text-xs text-muted-foreground">Completed At</p>
                            <p className="text-sm font-medium">{formatAUDate(request.completed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Request Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Printer className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Printer Model</p>
                    <p className="text-sm font-medium">{request.printer_model || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="text-sm font-medium">{request.quantity}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Site/Location</p>
                    <p className="text-sm font-medium">{request.site || 'N/A'}</p>
                  </div>
                </div>
                {request.colors_required && request.colors_required.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Colors Required</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {request.colors_required.map((color) => (
                          <Badge key={color} variant="outline" className="text-xs">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {request.description && (
              <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Description
                </h3>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{request.description}</p>
              </div>
            )}
          </div>

          {request.predicted_toner_models && request.predicted_toner_models !== 'Not available' && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">AI-Predicted Toner Models</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">{request.predicted_toner_models}</pre>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Section */}
      <RequestActivity requestId={request.id} requestType="toner" />

      {/* Email Logs */}
      <EmailLogs requestId={request.id} />
    </div>
  );
}
