import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface MailgunAttachment {
  url: string;
  'content-type': string;
  name: string;
  size: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received incoming email webhook');
    
    const formData = await req.formData();
    
    // Extract email data from Mailgun webhook
    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const subject = formData.get('subject') as string;
    const bodyPlain = formData.get('body-plain') as string;
    const bodyHtml = formData.get('body-html') as string;
    const timestamp = formData.get('timestamp') as string;
    const token = formData.get('token') as string;
    const signature = formData.get('signature') as string;
    
    console.log('Email details:', { recipient, sender, subject });
    
    // Only process emails to vrg@crowdhub.app
    if (!recipient || !recipient.includes('vrg@crowdhub.app')) {
      console.log('Email not for vrg@crowdhub.app, ignoring');
      return new Response(
        JSON.stringify({ message: 'Email not for monitored address' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find Vision Radiology company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Vision Radiology')
      .single();

    if (companyError || !company) {
      console.error('Vision Radiology company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Vision Radiology company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found Vision Radiology company:', company.id);

    // Find a user within Vision Radiology company to use as the requestor
    const { data: users } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('company_id', company.id)
      .limit(1);

    if (!users || users.length === 0) {
      throw new Error('No users found for Vision Radiology company');
    }

    const requesterId = users[0].user_id;

    // Use AI to analyze email and determine request type and fields
    console.log('Analyzing email with AI...');
    const aiAnalysis = await analyzeEmailWithAI(subject, bodyPlain, bodyHtml);
    console.log('AI Analysis:', JSON.stringify(aiAnalysis));

    // Create the appropriate request type based on AI analysis
    let request: any;
    let requestError: any;
    
    if (aiAnalysis.requestType === 'hardware') {
      const { data, error } = await supabase
        .from('hardware_requests')
        .insert({
          company_id: company.id,
          user_id: requesterId,
          title: aiAnalysis.title || subject || 'Hardware Request',
          business_justification: aiAnalysis.description || bodyPlain || bodyHtml,
          status: 'inbox',
          location_id: aiAnalysis.locationId,
          from_email: true,
        })
        .select()
        .single();
      request = data;
      requestError = error;
    } else if (aiAnalysis.requestType === 'toner') {
      const { data, error } = await supabase
        .from('toner_requests')
        .insert({
          company_id: company.id,
          user_id: requesterId,
          brand: aiAnalysis.brand || 'Unknown',
          model: aiAnalysis.model || 'Unknown',
          quantity: aiAnalysis.quantity || 1,
          notes: aiAnalysis.description || bodyPlain || bodyHtml,
          status: 'inbox',
          location_id: aiAnalysis.locationId,
          from_email: true,
        })
        .select()
        .single();
      request = data;
      requestError = error;
    } else if (aiAnalysis.requestType === 'marketing') {
      const { data, error } = await supabase
        .from('marketing_requests')
        .insert({
          company_id: company.id,
          user_id: requesterId,
          title: aiAnalysis.title || subject || 'Marketing Request',
          request_type: aiAnalysis.marketingType || 'website_update',
          description: aiAnalysis.description || bodyPlain || bodyHtml,
          status: 'inbox',
          from_email: true,
        })
        .select()
        .single();
      request = data;
      requestError = error;
    } else if (aiAnalysis.requestType === 'user_account') {
      const { data, error } = await supabase
        .from('user_account_requests')
        .insert({
          company_id: company.id,
          requested_by: requesterId,
          request_type: aiAnalysis.accountRequestType || 'new_account',
          requested_for_name: aiAnalysis.userName || 'Unknown',
          requested_for_email: aiAnalysis.userEmail,
          department: aiAnalysis.department,
          job_title: aiAnalysis.jobTitle,
          notes: aiAnalysis.description || bodyPlain || bodyHtml,
          status: 'inbox',
          from_email: true,
        })
        .select()
        .single();
      request = data;
      requestError = error;
    } else {
      // Default to department request
      const { data, error } = await supabase
        .from('department_requests')
        .insert({
          company_id: company.id,
          user_id: requesterId,
          department: aiAnalysis.department || 'it_service_desk',
          sub_department: aiAnalysis.subDepartment || 'General Support',
          title: aiAnalysis.title || subject || 'Request',
          description: aiAnalysis.description || bodyPlain || bodyHtml,
          status: 'inbox',
          priority: aiAnalysis.priority || 'medium',
          from_email: true,
        })
        .select()
        .single();
      request = data;
      requestError = error;
    }

    if (requestError) {
      throw new Error(`Failed to create ${aiAnalysis.requestType} request: ${requestError.message}`);
    }

    console.log('Created request:', request.id, 'Type:', aiAnalysis.requestType);

    // Log the incoming email
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        email_type: 'incoming',
        request_type: aiAnalysis.requestType,
        subject: subject || 'No Subject',
        recipient_email: recipient,
        status: 'received',
        request_id: request.id,
        metadata: {
          sender: sender,
          timestamp: timestamp,
          body_preview: bodyPlain?.substring(0, 200) || bodyHtml?.substring(0, 200) || 'No content',
          ai_classification: aiAnalysis
        }
      });

    if (logError) {
      console.error('Error logging incoming email:', logError);
    }

    // Handle attachments
    const attachmentCount = parseInt(formData.get('attachment-count') as string || '0');
    console.log('Processing', attachmentCount, 'attachments');

    for (let i = 1; i <= attachmentCount; i++) {
      const attachmentFile = formData.get(`attachment-${i}`) as File;
      
      if (attachmentFile) {
        try {
          console.log(`Processing attachment ${i}:`, attachmentFile.name);
          
          const filePath = `${request.id}/${Date.now()}-${attachmentFile.name}`;
          const fileData = await attachmentFile.arrayBuffer();
          
          const { error: uploadError } = await supabase.storage
            .from('request-attachments')
            .upload(filePath, fileData, {
              contentType: attachmentFile.type,
              upsert: false
            });

          if (uploadError) {
            console.error(`Error uploading attachment ${i}:`, uploadError);
            continue;
          }

          const { error: attachmentError } = await supabase
            .from('request_attachments')
            .insert({
              request_id: request.id,
              request_type: aiAnalysis.requestType,
              file_name: attachmentFile.name,
              file_path: filePath,
              file_size: attachmentFile.size,
              content_type: attachmentFile.type,
              uploaded_by: requesterId
            });

          if (attachmentError) {
            console.error(`Error creating attachment record ${i}:`, attachmentError);
          } else {
            console.log(`Successfully uploaded attachment ${i}`);
          }
        } catch (err) {
          console.error(`Error processing attachment ${i}:`, err);
        }
      }
    }

    console.log('Email processing complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        requestId: request.id,
        requestType: aiAnalysis.requestType,
        message: `${aiAnalysis.requestType} request created successfully from email`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing incoming email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeEmailWithAI(subject: string, bodyPlain: string, bodyHtml: string): Promise<any> {
  const emailContent = bodyPlain || bodyHtml || '';
  
  const systemPrompt = `You are an AI assistant that analyzes incoming emails and categorizes them into IT service desk requests for Vision Radiology.

Analyze the email and determine:
1. Request Type: hardware, toner, marketing, user_account, or department
2. Extract relevant fields and provide appropriate categorization

For hardware requests:
- title: Clear, descriptive title for the hardware request
- description: Full description of the hardware needed and reason
- locationId: Extract if clinic/location name is mentioned

For toner requests:
- brand: Printer brand (e.g., HP, Canon, Brother, Xerox)
- model: Specific printer model number
- quantity: Number of toner cartridges needed
- description: Additional details or notes

For marketing requests:
- title: Clear title for the marketing request
- marketingType: fax_blast, email_blast, or website_update
- description: What needs to be done

For user_account requests:
- accountRequestType: new_account, modify_account, or disable_account
- userName: Full name of the person
- userEmail: Email address for the account
- department: Department (e.g., Radiology, Admin, IT)
- jobTitle: Job title/position
- description: Additional details

For department requests (IT Service Desk):
- department: Usually "it_service_desk" for general IT requests
- subDepartment: Choose from: "Get IT help", "Access mail Inbox", "Remote Access - VPN", "Computer Support", "License Support", "Request New software", "Request New hardware", "Mobile Device Issues", "Permission access", "Reset Password", "Printing/printer Issue", "Work from home equipment", "General Support"
- title: Clear, concise title
- description: Full description
- priority: low, medium, high (based on urgency indicated in email)

Respond ONLY with a valid JSON object, no additional text.`;

  const userPrompt = `Subject: ${subject}
  
Content: ${emailContent}

Analyze this email and provide the categorization and extracted fields. Choose the most appropriate category based on the content.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'categorize_request',
            description: 'Categorize the email into a request type and extract fields',
            parameters: {
              type: 'object',
              properties: {
                requestType: {
                  type: 'string',
                  enum: ['hardware', 'toner', 'marketing', 'user_account', 'department']
                },
                title: { type: 'string' },
                description: { type: 'string' },
                department: { type: 'string' },
                subDepartment: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                brand: { type: 'string' },
                model: { type: 'string' },
                quantity: { type: 'number' },
                marketingType: { type: 'string', enum: ['fax_blast', 'email_blast', 'website_update'] },
                accountRequestType: { type: 'string', enum: ['new_account', 'modify_account', 'disable_account'] },
                userName: { type: 'string' },
                userEmail: { type: 'string' },
                jobTitle: { type: 'string' },
                locationId: { type: 'string' }
              },
              required: ['requestType']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'categorize_request' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
    return { requestType: 'department', department: 'it_service_desk', subDepartment: 'General Support' };
    }

    const data = await response.json();
    
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
      return args;
    }

    return { requestType: 'department', department: 'it_service_desk', subDepartment: 'General Support' };
  } catch (error) {
    console.error('Error analyzing email with AI:', error);
    return { requestType: 'department', department: 'IT', subDepartment: 'Email Request' };
  }
}