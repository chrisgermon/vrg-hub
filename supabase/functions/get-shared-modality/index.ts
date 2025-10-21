import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('Token is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the share link
    const { data: shareLink, error: linkError } = await supabase
      .from('shared_modality_links')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (linkError) throw linkError;

    if (!shareLink) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get modality details with clinic info
    const { data: modality, error: modalityError } = await supabase
      .from('modalities')
      .select(`
        *,
        clinic:clinics(id, location_name, ip_range, gateway, notes),
        brand:brands(id, name, display_name),
        location:locations(id, name)
      `)
      .eq('id', shareLink.modality_id)
      .single();

    if (modalityError) throw modalityError;

    // Get DICOM servers for the clinic
    const { data: servers } = await supabase
      .from('dicom_servers')
      .select('*')
      .eq('clinic_id', modality.clinic.id);

    // Increment access count and update last accessed
    await supabase
      .from('shared_modality_links')
      .update({ 
        access_count: shareLink.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', shareLink.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        modality,
        servers: servers || [],
        accessCount: shareLink.access_count + 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching shared modality:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});