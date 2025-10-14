import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Hash, Loader2, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompanyRequestPrefixManagerProps {
  companyId: string;
}

export function CompanyRequestPrefixManager({ companyId }: CompanyRequestPrefixManagerProps) {
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPrefix, setHasPrefix] = useState(false);

  useEffect(() => {
    fetchPrefix();
  }, [companyId]);

  const fetchPrefix = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_request_prefixes')
        .select('prefix')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPrefix(data.prefix);
        setHasPrefix(true);
      } else {
        setPrefix('');
        setHasPrefix(false);
      }
    } catch (error: any) {
      console.error('Error fetching prefix:', error);
      toast.error('Failed to load request prefix');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate prefix
    if (!prefix || prefix.length !== 3) {
      toast.error('Prefix must be exactly 3 characters');
      return;
    }

    const upperPrefix = prefix.toUpperCase();
    if (!/^[A-Z]{3}$/.test(upperPrefix)) {
      toast.error('Prefix must contain only letters (A-Z)');
      return;
    }

    try {
      setSaving(true);

      if (hasPrefix) {
        // Update existing prefix
        const { error } = await supabase
          .from('company_request_prefixes')
          .update({ prefix: upperPrefix, updated_at: new Date().toISOString() })
          .eq('company_id', companyId);

        if (error) throw error;
      } else {
        // Insert new prefix
        const { error } = await supabase
          .from('company_request_prefixes')
          .insert({
            company_id: companyId,
            prefix: upperPrefix
          });

        if (error) throw error;

        // Also initialize the counter
        const { error: counterError } = await supabase
          .from('company_request_counters')
          .insert({
            company_id: companyId,
            counter: 0
          });

        if (counterError && counterError.code !== '23505') { // Ignore duplicate key errors
          throw counterError;
        }

        setHasPrefix(true);
      }

      setPrefix(upperPrefix);
      toast.success('Request prefix updated successfully');
    } catch (error: any) {
      console.error('Error saving prefix:', error);
      if (error.code === '23505') {
        toast.error('This prefix is already in use by another company');
      } else {
        toast.error('Failed to save request prefix');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 3);
    setPrefix(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Request Number Prefix
          </CardTitle>
          <CardDescription>
            Configure the 3-letter prefix for request numbers (e.g., VRG-0001)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Request Number Prefix
        </CardTitle>
        <CardDescription>
          Configure the 3-letter prefix for request numbers (e.g., VRG-0001)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            All new requests will be automatically numbered with this prefix. Example: If you set "VRG", 
            requests will be numbered as VRG-0001, VRG-0002, etc.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="prefix">Request Prefix (3 letters)</Label>
          <div className="flex gap-2">
            <Input
              id="prefix"
              value={prefix}
              onChange={handleInputChange}
              placeholder="ABC"
              maxLength={3}
              className="w-32 font-mono text-lg uppercase"
            />
            <Button onClick={handleSave} disabled={saving || prefix.length !== 3}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Prefix
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Must be exactly 3 uppercase letters (A-Z only)
          </p>
        </div>

        {hasPrefix && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Request numbers will look like:</p>
              <code className="text-lg font-mono font-semibold">{prefix}-0001</code>
              <span className="mx-2 text-muted-foreground">•</span>
              <code className="text-lg font-mono font-semibold">{prefix}-0002</code>
              <span className="mx-2 text-muted-foreground">•</span>
              <code className="text-lg font-mono font-semibold">{prefix}-0003</code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}