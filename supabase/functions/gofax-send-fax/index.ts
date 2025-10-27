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
    if (!GOFAX_API_KEY) throw new Error('GOFAX_API_KEY is not configured');

    const { recipients, documentUrl, fileName, subject, fromEmail } = await req.json();
    if (!recipients || recipients.length === 0 || !documentUrl) {
      throw new Error('Recipients and document URL are required');
    }

    // Determine required SendFrom address
    const DEFAULT_FROM = Deno.env.get('GOFAX_FROM_EMAIL') || '';
    const sendFrom = String(fromEmail || DEFAULT_FROM).trim();
    if (!sendFrom) {
      return new Response(
        JSON.stringify({ error: 'GoFax requires a SendFrom email. Provide fromEmail in the request or set GOFAX_FROM_EMAIL in secrets.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Using SendFrom: ${sendFrom}`);

    // Sanitize recipients to GoFax expected format: numeric with country code (e.g., 613..., 614...)
    const sanitizeNumber = (num: string) => {
      const cleaned = String(num).replace(/[^\d+]/g, '');
      if (cleaned.startsWith('+')) return cleaned;
      const digits = cleaned.replace(/\D/g, '');
      if (digits.startsWith('61')) return `+${digits}`;
      if (digits.startsWith('0')) return `+61${digits.slice(1)}`;
      return `+${digits}`;
    };
    const cleanedRecipients: string[] = recipients.map((r: string) => sanitizeNumber(r));

    console.log(`Sending fax to ${cleanedRecipients.length} recipient(s) with document ${fileName || 'untitled'}`);

    // Preflight: check size to avoid memory limit issues
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    try {
      const headResp = await fetch(documentUrl, { method: 'HEAD' });
      const len = headResp.headers.get('content-length');
      if (len && parseInt(len) > MAX_SIZE_BYTES) {
        return new Response(
          JSON.stringify({ error: `Document too large (${len} bytes). Please upload a file under 5 MB.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413 }
        );
      }
    } catch (_) {
      // Ignore HEAD failures, proceed to GET
    }

    // Download the document and convert to base64 per GoFax v1.0 API requirements
    const fileResp = await fetch(documentUrl);
    if (!fileResp.ok) {
      const errText = await fileResp.text();
      throw new Error(`Failed to fetch document: ${fileResp.status} - ${errText}`);
    }

    let arrayBuffer = await fileResp.arrayBuffer();
    const base64Data = base64Encode(arrayBuffer);
    // @ts-ignore - hint GC
    arrayBuffer = undefined;

    const makeFax = (to: string) => ({
      SendTo: to,
      SendFrom: sendFrom,
      Subject: subject || undefined,
      Documents: [
        {
          Filename: fileName || 'document.pdf',
          Data: base64Data,
        },
      ],
      // Optional client reference for traceability
      ClientReference: subject || undefined,
    });

    const isSingle = cleanedRecipients.length === 1;
    const url = isSingle
      ? `https://restful-api.gofax.com.au/v2.0/SendFax`
      : `https://restful-api.gofax.com.au/v2.0/SendFaxes`;


    const payload = isSingle ? makeFax(cleanedRecipients[0]) : cleanedRecipients.map((r: string) => makeFax(r));

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GOFAX_API_KEY}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GoFax API error:', errorText);
      throw new Error(`GoFax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully invoked GoFax API. Success: ${data?.Success ?? 'n/a'}`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in gofax-send-fax:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
