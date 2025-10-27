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

    const { page = 1, pageSize = 50, startDate, endDate } = await req.json();

    console.log(`Fetching fax details - Page: ${page}, Size: ${pageSize}`);

    let url = `https://restful-api.gofax.com.au/v2.0/SendFaxes/Detail?token=${GOFAX_API_KEY}&page=${page}&pageSize=${pageSize}`;
    
    if (startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
      url += `&endDate=${encodeURIComponent(endDate)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GOFAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoFax API error:', errorText);
      throw new Error(`GoFax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log(`Fetched ${data.totalRecords || 0} fax records`);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in gofax-get-details:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        records: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
