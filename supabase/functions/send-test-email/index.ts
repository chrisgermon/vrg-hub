import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  recipientEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail }: TestEmailRequest = await req.json();
    
    if (!recipientEmail) {
      throw new Error("Recipient email is required");
    }

    console.log('Sending test email to:', recipientEmail);

    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") || "mg.crowdhub.app";
    
    if (!mailgunApiKey) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    console.log('Mailgun domain:', mailgunDomain);
    console.log('API key exists:', !!mailgunApiKey);

    const emailContent = {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
            <img src="https://hub.visionradiology.com.au/vision-radiology-email-logo.png" alt="Vision Radiology" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #2563eb;">Test Email - CrowdHub System</h2>
          <p>Hello,</p>
          <p>This is a test email to verify that the CrowdHub email system is working correctly.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>System Test Results:</h3>
            <p><strong>✅ Mailgun Integration:</strong> Working</p>
            <p><strong>✅ Edge Function:</strong> Working</p>
            <p><strong>✅ Email Delivery:</strong> Working</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <p>If you received this email, your CrowdHub notification system is properly configured!</p>
        </div>
      `,
      text: `Test Email - CrowdHub System\n\nThis is a test email to verify that the email system is working correctly.\n\nTimestamp: ${new Date().toISOString()}`
    };
    
    const formData = new FormData();
    formData.append("from", "Vision Radiology Hub <hub@visionradiology.com.au>");
    formData.append("to", recipientEmail);
    formData.append("subject", "Test Email - CrowdHub System");
    formData.append("html", emailContent.html);
    formData.append("text", emailContent.text);

    console.log('Sending email via Mailgun...');

    const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${mailgunApiKey}`)}`
      },
      body: formData
    });

    console.log('Mailgun response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun API error:", errorText);
      throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent successfully to ${recipientEmail}`,
      mailgunResult: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);