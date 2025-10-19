import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2 } from 'lucide-react';

interface ExcelImporterProps {
  onSuccess: () => void;
}

export function ExcelImporter({ onSuccess }: ExcelImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!pastedData.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste the parsed Excel data',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      console.log('Calling parse-modality-excel with data length:', pastedData.length);
      
      // Call AI to parse and match
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-modality-excel', {
        body: { parsedText: pastedData }
      });

      console.log('AI Result:', aiResult);
      console.log('AI Error:', aiError);

      if (aiError) {
        console.error('Edge function error:', aiError);
        throw new Error(aiError.message || 'Failed to parse data');
      }

      if (!aiResult.sites || aiResult.sites.length === 0) {
        throw new Error('No sites found in the document');
      }

      // Import each site
      let successCount = 0;
      const errors: string[] = [];

      for (const site of aiResult.sites) {
        try {
          await importSiteData(site);
          successCount++;
        } catch (siteError: any) {
          errors.push(`${site.location_name}: ${siteError.message}`);
        }
      }

      if (successCount > 0) {
          toast({
            title: 'Success',
            description: `Successfully imported ${successCount} of ${aiResult.sites.length} sites`,
          });

          setIsOpen(false);
          setPastedData('');
          onSuccess();
      }

      if (errors.length > 0) {
        console.error('Import errors:', errors);
        toast({
          title: 'Partial Success',
          description: `${successCount} sites imported, ${errors.length} failed`,
          variant: errors.length === aiResult.sites.length ? 'destructive' : 'default',
        });
      }
    } catch (error: any) {
      console.error('Error importing Excel:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to import Excel file',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const importSiteData = async (siteData: any) => {
    // Check if clinic exists
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('location_name', siteData.location_name)
      .maybeSingle();

    let clinicId = existingClinic?.id;

    // Create clinic if it doesn't exist
    if (!existingClinic) {
      const { data: newClinic, error: clinicError } = await supabase
        .from('clinics')
        .insert({
          location_name: siteData.location_name,
          ip_range: siteData.ip_range || null,
          gateway: siteData.gateway || null,
        })
        .select()
        .single();

      if (clinicError) throw clinicError;
      clinicId = newClinic.id;
    }

    // Import servers
    if (siteData.servers && siteData.servers.length > 0) {
      for (const server of siteData.servers) {
        // Check if server exists
        const { data: existingServer } = await supabase
          .from('dicom_servers')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('ip_address', server.ip_address)
          .maybeSingle();

        if (!existingServer) {
          await supabase.from('dicom_servers').insert({
            clinic_id: clinicId,
            name: server.name,
            ip_address: server.ip_address,
            ae_title: server.ae_title || null,
            port: server.port || null,
            function: server.function || null,
          });
        }
      }
    }

    // Import modalities
    if (siteData.modalities && siteData.modalities.length > 0) {
      for (const modality of siteData.modalities) {
        // Check if modality exists
        const { data: existingModality } = await supabase
          .from('modalities')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('name', modality.name)
          .maybeSingle();

        if (!existingModality) {
          await supabase.from('modalities').insert({
            clinic_id: clinicId,
            brand_id: siteData.brand_id || null,
            location_id: siteData.location_id || null,
            name: modality.name,
            ip_address: modality.ip_address,
            ae_title: modality.ae_title || null,
            port: modality.port || null,
            worklist_ip_address: modality.worklist_ip_address || null,
            worklist_ae_title: modality.worklist_ae_title || null,
            worklist_port: modality.worklist_port || null,
            modality_type: modality.modality_type || null,
          });
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="w-4 h-4 mr-2" />
          Import from Parsed Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import DICOM Configuration</DialogTitle>
          <DialogDescription>
            Paste the parsed Excel data (from the document parser tool). AI will automatically match sites to brands and locations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="parsed-data">Parsed Data</Label>
            <Textarea
              id="parsed-data"
              placeholder="Paste parsed Excel data here..."
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              rows={15}
              className="font-mono text-xs"
              disabled={isImporting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Use the document parser on your Excel file first, then paste the result here
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting || !pastedData.trim()}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}