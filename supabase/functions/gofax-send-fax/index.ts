import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const url = `https://restful-api.gofax.com.au/v2.0/SendFaxes?token=${GOFAX_API_KEY}`;
    
    // Create a fax request for each recipient
    const faxData = recipients.map((faxNumber: string) => ({
      ToFaxNumber: faxNumber,
      Documents: [{
        FileLocation: documentUrl,
        FileName: fileName || 'document.pdf',
        Order: 0
      }],
      Subject: subject || 'Fax Document'
    }));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GOFAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(faxData),
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
