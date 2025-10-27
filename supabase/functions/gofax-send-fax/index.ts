import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOFAX_API_KEY = Deno.env.get('GOFAX_API_KEY');
    
    if (!GOFAX_API_KEY) {
      throw new Error('GOFAX_API_KEY is not configured');
    }

    const { recipients, documentUrl, fileName, subject } = await req.json();

    if (!recipients || recipients.length === 0 || !documentUrl) {
      throw new Error('Recipients and document URL are required');
    }

    console.log(`Sending fax to ${recipients.length} recipient(s) with document ${fileName || 'untitled'}`);

    // Download the document and convert to base64 per GoFax v1.0 API requirements
    const fileResp = await fetch(documentUrl);
    if (!fileResp.ok) {
      const errText = await fileResp.text();
      throw new Error(`Failed to fetch document: ${fileResp.status} - ${errText}`);
    }
    const arrayBuffer = await fileResp.arrayBuffer();
    const base64Data = base64Encode(arrayBuffer);

    // Build payload(s) for v1.0 endpoints
    const makeFax = (to: string) => ({
      SendTo: to,
      Documents: [
        {
          Filename: fileName || 'document.pdf',
          Data: base64Data,
        },
      ],
    });

    const isSingle = recipients.length === 1;
    const url = isSingle
      ? `https://restful-api.gofax.com.au/v1.0/SendFax?token=${GOFAX_API_KEY}`
      : `https://restful-api.gofax.com.au/v1.0/SendFaxes?token=${GOFAX_API_KEY}`;

    const payload = isSingle ? makeFax(recipients[0]) : recipients.map((r: string) => makeFax(r));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoFax API error:', errorText);
      throw new Error(`GoFax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`Successfully sent fax to ${recipients.length} recipients. Response:`, data);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in gofax-send-fax:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
