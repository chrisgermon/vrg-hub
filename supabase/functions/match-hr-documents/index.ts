import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { expectedDocuments, availableDocuments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a document matching expert. Match expected HR document names with actual document filenames, considering variations in naming, abbreviations, and file extensions. Return matches as JSON.'
          },
          {
            role: 'user',
            content: `Match these expected documents with available files:\n\nExpected: ${JSON.stringify(expectedDocuments)}\n\nAvailable: ${JSON.stringify(availableDocuments)}\n\nReturn a JSON object mapping each expected document name to its best match filename, or null if no good match exists. Format: {"expectedName": "matchedFilename" or null}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return the matched documents",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "object",
                    description: "Map of expected document names to matched filenames",
                    additionalProperties: {
                      type: ["string", "null"]
                    }
                  }
                },
                required: ["matches"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call returned from AI');
    }

    const matches = JSON.parse(toolCall.function.arguments).matches;

    return new Response(
      JSON.stringify({ matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-hr-documents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
