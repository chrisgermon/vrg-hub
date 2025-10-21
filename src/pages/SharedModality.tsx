import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Network, Server, MonitorDot } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SharedModality() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchSharedModality();
    }
  }, [token]);

  const fetchSharedModality = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the edge function with the token as a query parameter
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-modality?token=${token}`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load shared modality');
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (err: any) {
      console.error('Error fetching shared modality:', err);
      setError(err.message || 'Failed to load modality');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading modality details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || !data.modality) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Modality not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { modality, servers } = data;
  const clinic = modality.clinic;
  const brand = modality.brand;
  const location = modality.location;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Shared Modality Configuration</h1>
        </div>
        <p className="text-muted-foreground">
          View-only access to modality details and DICOM configuration
        </p>
      </div>

      {/* Clinic Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorDot className="w-5 h-5" />
            {clinic.location_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clinic.ip_range && (
              <div>
                <p className="text-sm text-muted-foreground">IP Range</p>
                <p className="font-medium">{clinic.ip_range}</p>
              </div>
            )}
            {clinic.gateway && (
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-medium">{clinic.gateway}</p>
              </div>
            )}
            {brand && (
              <div>
                <p className="text-sm text-muted-foreground">Brand</p>
                <p className="font-medium">{brand.display_name}</p>
              </div>
            )}
            {location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{location.name}</p>
              </div>
            )}
          </div>
          {clinic.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{clinic.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modality Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Modality Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>AE Title</TableHead>
                  <TableHead>Port</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{modality.name}</TableCell>
                  <TableCell>
                    {modality.modality_type ? (
                      <Badge>{modality.modality_type}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{modality.ip_address}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {modality.ae_title || '-'}
                  </TableCell>
                  <TableCell>{modality.port || '-'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Worklist Configuration */}
          {(modality.worklist_ip_address || modality.worklist_ae_title || modality.worklist_port) && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Worklist Configuration</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worklist IP</TableHead>
                      <TableHead>Worklist AE Title</TableHead>
                      <TableHead>Worklist Port</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-sm">
                        {modality.worklist_ip_address || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {modality.worklist_ae_title || '-'}
                      </TableCell>
                      <TableCell>{modality.worklist_port || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {modality.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{modality.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DICOM Servers */}
      {servers && servers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              DICOM Servers ({servers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>AE Title</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Function</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map((server: any) => (
                    <TableRow key={server.id}>
                      <TableCell className="font-medium">{server.name}</TableCell>
                      <TableCell className="font-mono text-sm">{server.ip_address}</TableCell>
                      <TableCell className="font-mono text-sm">{server.ae_title || '-'}</TableCell>
                      <TableCell>{server.port || '-'}</TableCell>
                      <TableCell>{server.function || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>This is a read-only view of the modality configuration</p>
        <p>Shared via Vision Radiology Hub</p>
      </div>
    </div>
  );
}