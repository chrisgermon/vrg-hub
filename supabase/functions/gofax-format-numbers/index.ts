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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { numbers } = await req.json();

    if (!numbers || numbers.trim() === '') {
      throw new Error('No numbers provided');
    }

    console.log(`Formatting phone numbers with AI`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a phone number formatter. Extract and format phone numbers for GoFax API. GoFax expects numbers in international format (e.g., +61291234567). Return ONLY a JSON array of formatted numbers, nothing else. If a number doesn't look valid, skip it. Remove any duplicates."
          },
          { 
            role: "user", 
            content: `Extract and format these phone numbers for fax sending:\n\n${numbers}\n\nReturn only valid phone numbers in international format as a JSON array like ["+61291234567", "+61298765432"]`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const formattedText = data.choices?.[0]?.message?.content || '[]';
    
    // Extract JSON array from response
    const jsonMatch = formattedText.match(/\[.*\]/s);
    const formattedNumbers = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    console.log(`Formatted ${formattedNumbers.length} valid numbers`);

    return new Response(
      JSON.stringify({ formattedNumbers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in gofax-format-numbers:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        formattedNumbers: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
