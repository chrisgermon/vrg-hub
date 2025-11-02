import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and permissions
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .eq("id", user.id)
      .single();

    const userRole = profile?.user_roles?.[0]?.role || "requester";

    // Define available tools based on permissions
    const tools = [
      {
        type: "function",
        function: {
          name: "create_it_request",
          description: "Create a new IT support request",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Brief description of the issue" },
              description: { type: "string", description: "Detailed description of the issue" },
              location: { type: "string", description: "Location where the issue is occurring" },
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "urgent"],
                description: "Priority level of the request",
              },
            },
            required: ["title", "description"],
          },
        },
      },
    ];

    // Call Lovable AI with tools
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an AI assistant for an IT management system. You can help users perform actions based on their permissions. Current user role: ${userRole}. When users ask to create requests or perform actions, use the available functions. Be helpful and concise.`,
          },
          { role: "user", content: prompt },
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const message = aiData.choices[0].message;

    // Check if AI wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Execute the function
      if (functionName === "create_it_request") {
        const { data: request, error: requestError } = await supabase
          .from("requests")
          .insert({
            user_id: user.id,
            title: functionArgs.title,
            description: functionArgs.description,
            location: functionArgs.location || null,
            priority: functionArgs.priority || "medium",
            status: "open",
            type: "hardware",
          })
          .select()
          .single();

        if (requestError) {
          return new Response(
            JSON.stringify({
              response: `I encountered an error creating the request: ${requestError.message}`,
              error: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            response: `I've successfully created IT request #${request.id} for "${functionArgs.title}". The request has been submitted and will be reviewed by the IT team.`,
            action: "create_request",
            requestId: request.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Return AI's text response if no function was called
    return new Response(
      JSON.stringify({
        response: message.content || "I'm not sure how to help with that.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
