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

    console.log('Fetching GoFax credit balance');

    const url = `https://restful-api.gofax.com.au/v2.0/Account/CreditBalance`;

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
    
    console.log(`Credit balance: ${data.result || 0}`);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in gofax-credit-balance:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        result: 0,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
