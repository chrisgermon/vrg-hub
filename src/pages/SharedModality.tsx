import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Network, Server, MapPin, Building } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SharedModalityData {
  id: string;
  name: string;
  ip_address: string;
  ae_title?: string;
  port?: number;
  worklist_ip_address?: string;
  worklist_ae_title?: string;
  worklist_port?: number;
  modality_type?: string;
  notes?: string;
  clinic?: {
    id: string;
    location_name: string;
    ip_range?: string;
    gateway?: string;
    notes?: string;
  };
  brand?: {
    id: string;
    name: string;
    display_name: string;
  };
  location?: {
    id: string;
    name: string;
  };
}

export default function SharedModality() {
  const { token } = useParams<{ token: string }>();
  const [modality, setModality] = useState<SharedModalityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessCount, setAccessCount] = useState<number>(0);

  useEffect(() => {
    loadSharedModality();
  }, [token]);

  const loadSharedModality = async () => {
    if (!token) {
      setError('Invalid link');
      setLoading(false);
      return;
    }

    try {
      // Use the token from URL params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-shared-modality?token=${token}`,
        {
          headers: {
            'apikey': supabaseKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load modality');
      }

      const result = await response.json();
      setModality(result.modality);
      setAccessCount(result.accessCount);
    } catch (err: any) {
      console.error('Error loading shared modality:', err);
      setError(err.message || 'Failed to load modality details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading modality details...</p>
        </div>
      </div>
    );
  }

  if (error || !modality) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to Load</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'Modality not found. The link may have expired or been revoked.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-6">
          <h1 className="text-3xl font-bold">Modality Configuration</h1>
          <p className="text-primary-foreground/80 mt-2">Shared configuration details</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Modality Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  {modality.name}
                </CardTitle>
                {modality.modality_type && (
                  <Badge variant="secondary">{modality.modality_type}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                  <p className="text-lg font-mono">{modality.ip_address}</p>
                </div>
                {modality.ae_title && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AE Title</label>
                    <p className="text-lg font-mono">{modality.ae_title}</p>
                  </div>
                )}
                {modality.port && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Port</label>
                    <p className="text-lg font-mono">{modality.port}</p>
                  </div>
                )}
              </div>

              {(modality.worklist_ip_address || modality.worklist_ae_title || modality.worklist_port) && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Worklist Configuration</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {modality.worklist_ip_address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Worklist IP</label>
                        <p className="text-lg font-mono">{modality.worklist_ip_address}</p>
                      </div>
                    )}
                    {modality.worklist_ae_title && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Worklist AE Title</label>
                        <p className="text-lg font-mono">{modality.worklist_ae_title}</p>
                      </div>
                    )}
                    {modality.worklist_port && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Worklist Port</label>
                        <p className="text-lg font-mono">{modality.worklist_port}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modality.notes && (
                <div className="border-t pt-4 mt-4">
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-sm">{modality.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clinic Info Card */}
          {modality.clinic && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Clinic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-lg">{modality.clinic.location_name}</p>
                </div>
                {modality.clinic.ip_range && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Range</label>
                    <p className="font-mono">{modality.clinic.ip_range}</p>
                  </div>
                )}
                {modality.clinic.gateway && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gateway</label>
                    <p className="font-mono">{modality.clinic.gateway}</p>
                  </div>
                )}
                {modality.clinic.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{modality.clinic.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Brand & Location Card */}
          {(modality.brand || modality.location) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {modality.brand && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <p className="text-lg">{modality.brand.display_name}</p>
                  </div>
                )}
                {modality.location && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-lg">{modality.location.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            <p>This link has been accessed {accessCount} time{accessCount !== 1 ? 's' : ''}</p>
            <p className="mt-2">Powered by Vision Radiology Hub</p>
          </div>
        </div>
      </div>
    </div>
  );
}