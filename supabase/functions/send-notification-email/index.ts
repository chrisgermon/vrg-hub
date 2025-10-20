import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  template: 'request_submitted' | 'request_approved' | 'request_declined' | 'request_ordered' | 'hardware_order_notification' | 'user_account_notification' | 'marketing_request_submitted' | 'marketing_request_approved' | 'marketing_request_declined' | 'department_request_submitted' | 'request_comment_reply';
  data: {
    requestTitle?: string;
    requestId: string;
    requestNumber?: string;
    requestUrl?: string;
    requesterName: string;
    managerName?: string;
    adminName?: string;
    assigneeName?: string;
    commenterName?: string;
    commentText?: string;
    declineReason?: string;
    totalAmount?: number;
    currency?: string;
    managerEmail?: string;
    approvalToken?: string;
    items?: any[];
    clinicName?: string;
    businessJustification?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    department?: string;
    subDepartment?: string;
    jobTitle?: string;
    startDate?: string;
    office365License?: string;
    sharedMailboxes?: string[];
    roles?: string[];
    applications?: string[];
    requestType?: string;
    brand?: string;
    clinic?: string;
    description?: string;
    priority?: string;
    scheduledSendDate?: string;
  };
}

const generateApprovalToken = async (requestId: string, managerEmail: string): Promise<string> => {
  const secret = Deno.env.get('EMAIL_APPROVAL_SECRET') || 'fallback-secret';
  const data = `${requestId}:${managerEmail}:${secret}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const getEmailTemplate = (template: string, data: any): { html: string; text: string } => {
  const appUrl = 'https://hub.visionradiology.com.au';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://znpjdrmvjfmneotdhwdo.supabase.co';
  const logoUrl = 'https://znpjdrmvjfmneotdhwdo.supabase.co/storage/v1/object/public/company-assets/crowdhub-logo.png';
  
  // Common header with logo (CID, will fall back to URL if inline attach fails)
  const emailHeader = `
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 30px;">
      <img src="cid:crowdhub-logo.png" alt="CrowdHub" style="max-width: 200px; height: auto;" />
    </div>
  `;
  
  // Common footer with request ID
  const emailFooter = (requestId?: string, requestNumber?: string) => `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #666; font-size: 12px; text-align: center;">
      ${requestId || requestNumber ? `<p><strong>Reference:</strong> ${requestNumber || requestId}</p>` : ''}
      <p>© ${new Date().getFullYear()} CrowdHub. All rights reserved.</p>
    </div>
  `;
  
  switch (template) {
    case 'request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Hardware Request Submitted</h2>
            <p>Hello,</p>
            <p>A new hardware request has been submitted and requires your approval:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p><strong>Quick Actions:</strong></p>
              <a href="${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=approve&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 0 10px; display: inline-block;">
                ✅ Approve Request
              </a>
              <a href="${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=decline&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 0 10px; display: inline-block;">
                ❌ Decline Request
              </a>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${appUrl}/requests/${data.requestId}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Full Details</a>
            </p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Hardware Request Submitted\n\nHello,\n\nA new hardware request has been submitted: ${data.requestTitle}\nSubmitted by: ${data.requesterName}\n\nTo approve: ${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=approve&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}\n\nTo decline: ${supabaseUrl}/functions/v1/approve-request-email?requestId=${data.requestId}&action=decline&managerEmail=${encodeURIComponent(data.managerEmail || '')}&token=${data.approvalToken}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'request_approved':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">Request Approved ✅</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Great news! Your hardware request has been approved:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Approved by:</strong> ${data.managerName || data.adminName}</p>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <p>Your request is now being processed and you'll receive updates on the delivery status.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Approved\n\nHello ${data.requesterName},\n\nYour hardware request has been approved: ${data.requestTitle}\nApproved by: ${data.managerName || data.adminName}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'request_declined':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #dc2626;">Request Declined</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Unfortunately, your hardware request has been declined:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Declined by:</strong> ${data.managerName || data.adminName}</p>
              ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
            </div>
            
            <p>If you have questions about this decision, please contact your manager or IT administrator.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Declined\n\nHello ${data.requesterName},\n\nYour hardware request has been declined: ${data.requestTitle}\nReason: ${data.declineReason || 'Not specified'}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'request_ordered':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">Request Ordered 🚚</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Your approved hardware request has been ordered:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.requestTitle}</h3>
              ${data.totalAmount ? `<p><strong>Total Amount:</strong> ${data.currency || 'USD'} ${data.totalAmount}</p>` : ''}
            </div>
            
            <p>You'll receive another notification once your items have been delivered.</p>
            <p><a href="${appUrl}/requests/${data.requestId}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Track Request Status</a></p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Request Ordered\n\nHello ${data.requesterName},\n\nYour hardware request has been ordered: ${data.requestTitle}\n\nYou'll receive updates on delivery status.\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'hardware_order_notification':
      const itemsList = data.items?.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.model_number || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.vendor || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency || 'AUD'} ${item.unit_price || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency || 'AUD'} ${item.total_price || 'N/A'}</td>
        </tr>
      `).join('') || '';

      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">New Hardware Order - Action Required 📦</h2>
            <p>A hardware request has been approved and is ready to order:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Requested by:</strong> ${data.requesterName}</p>
              <p><strong>Approved by:</strong> ${data.managerName}</p>
              ${data.clinicName ? `<p><strong>Clinic:</strong> ${data.clinicName}</p>` : ''}
              <p><strong>Total Amount:</strong> ${data.currency || 'AUD'} ${data.totalAmount || '0.00'}</p>
            </div>

            ${data.businessJustification ? `
              <div style="margin: 20px 0;">
                <h4>Business Justification:</h4>
                <p style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">${data.businessJustification}</p>
              </div>
            ` : ''}

            <h4>Items to Order:</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Model</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Vendor</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/confirm-order/${data.confirmToken}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Mark as Ordered</a>
            </div>

            <p style="text-align: center; margin-top: 15px;">
              <a href="${appUrl}/requests/${data.requestId}" style="color: #2563eb; text-decoration: none;">View Full Request Details</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Click "Mark as Ordered" to confirm the order and optionally add tracking details and delivery date. This will automatically notify the requester.</p>
            
            <p>Best regards,<br>CrowdHub System</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Hardware Order - Action Required\n\nRequest: ${data.requestTitle}\nRequested by: ${data.requesterName}\nApproved by: ${data.managerName}\nTotal Amount: ${data.currency || 'AUD'} ${data.totalAmount}\n\nMark as ordered: ${appUrl}/confirm-order/${data.confirmToken}\nView details: ${appUrl}/requests/${data.requestId}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub System`
      };

    case 'user_account_notification':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New User Account Request 👤</h2>
            <p>A new user account request has been submitted and approved:</p>
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3>${data.firstName} ${data.lastName}</h3>
              <p><strong>Email:</strong> ${data.email}</p>
              ${data.department ? `<p><strong>Department:</strong> ${data.department}</p>` : ''}
              ${data.jobTitle ? `<p><strong>Job Title:</strong> ${data.jobTitle}</p>` : ''}
              ${data.startDate ? `<p><strong>Start Date:</strong> ${data.startDate}</p>` : ''}
              ${data.office365License ? `<p><strong>Office 365 License:</strong> ${data.office365License}</p>` : ''}
            </div>

            ${data.sharedMailboxes && data.sharedMailboxes.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Shared Mailboxes:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.sharedMailboxes.map((mailbox: string) => `<li>${mailbox}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${data.roles && data.roles.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Roles:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.roles.map((role: string) => `<li>${role}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            ${data.applications && data.applications.length > 0 ? `
              <div style="margin: 15px 0;">
                <h4>Application Access:</h4>
                <ul style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  ${data.applications.map((app: string) => `<li>${app}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div style="margin: 20px 0;">
              <p><strong>Requested by:</strong> ${data.requesterName}</p>
              ${data.managerName ? `<p><strong>Approved by:</strong> ${data.managerName}</p>` : ''}
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/admin" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View in Admin Panel</a>
            </p>
            
            <p>Please create this user account in Active Directory and grant the necessary permissions.</p>
            <p>Best regards,<br>CrowdHub System</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New User Account Request\n\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nDepartment: ${data.department || 'N/A'}\nJob Title: ${data.jobTitle || 'N/A'}\n\nRequested by: ${data.requesterName}\n\nView in admin panel: ${appUrl}/admin\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub System`
      };

    case 'marketing_request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Marketing Request Submitted 📧</h2>
            <p>Hello,</p>
            <p>A new marketing request has been submitted and requires your approval:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              <p><strong>Priority:</strong> <span style="color: ${data.priority === 'urgent' ? '#dc2626' : data.priority === 'high' ? '#ea580c' : data.priority === 'medium' ? '#2563eb' : '#64748b'};">${data.priority?.toUpperCase()}</span></p>
              ${data.brand ? `<p><strong>Brand:</strong> ${data.brand}</p>` : ''}
              ${data.clinic ? `<p><strong>Clinic:</strong> ${data.clinic}</p>` : ''}
              ${data.scheduledSendDate ? `<p><strong>Scheduled for:</strong> ${data.scheduledSendDate}</p>` : ''}
            </div>

            ${data.description ? `
              <div style="margin: 20px 0;">
                <h4>Description:</h4>
                <p style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">${data.description}</p>
              </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${appUrl}/requests" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a>
            </p>
            
            <p>Please review and approve/decline this request at your earliest convenience.</p>
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Marketing Request Submitted\n\nTitle: ${data.requestTitle}\nType: ${data.requestType}\nSubmitted by: ${data.requesterName}\nPriority: ${data.priority}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'marketing_request_approved':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #16a34a;">Marketing Request Approved ✅</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Great news! Your marketing request has been approved:</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Approved by:</strong> ${data.managerName || data.adminName}</p>
              ${data.brand ? `<p><strong>Brand:</strong> ${data.brand}</p>` : ''}
              ${data.clinic ? `<p><strong>Clinic:</strong> ${data.clinic}</p>` : ''}
            </div>
            
            <p>Your request is now being processed by the marketing team.</p>
            <p><a href="${appUrl}/requests" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Status</a></p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Marketing Request Approved\n\nHello ${data.requesterName},\n\nYour marketing request has been approved: ${data.requestTitle}\nApproved by: ${data.managerName || data.adminName}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'marketing_request_declined':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #dc2626;">Marketing Request Declined</h2>
            <p>Hello ${data.requesterName},</p>
            <p>Unfortunately, your marketing request has been declined:</p>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Request Type:</strong> ${data.requestType?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Declined by:</strong> ${data.managerName || data.adminName}</p>
              ${data.declineReason ? `<p><strong>Reason:</strong> ${data.declineReason}</p>` : ''}
            </div>
            
            <p>If you have questions about this decision, please contact your manager or marketing team.</p>
            <p><a href="${appUrl}/requests" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Request Details</a></p>
            
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `Marketing Request Declined\n\nHello ${data.requesterName},\n\nYour marketing request has been declined: ${data.requestTitle}\nReason: ${data.declineReason || 'Not specified'}\n\nView details: ${appUrl}/requests\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'department_request_submitted':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New ${data.department || 'Department'} Request Submitted</h2>
            <p>Hello ${data.assigneeName || data.managerName || ''},</p>
            <p>A new ${data.department?.toLowerCase() || 'department'} request has been submitted ${data.assigneeName ? 'and assigned to you' : 'that requires attention'}:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p><strong>Submitted by:</strong> ${data.requesterName}</p>
              ${data.subDepartment ? `<p><strong>Request Type:</strong> ${data.subDepartment}</p>` : ''}
              ${data.priority ? `<p><strong>Priority:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${data.priority === 'urgent' ? '#dc2626' : data.priority === 'high' ? '#f59e0b' : '#6b7280'};">${data.priority}</span></p>` : ''}
              ${data.description ? `<p><strong>Description:</strong><br/>${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}</p>` : ''}
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <a href="${data.requestUrl || appUrl + '/requests'}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Full Details</a>
            </p>
            
            <p>Please review and respond to this request at your earliest convenience.</p>
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New ${data.department || 'Department'} Request Submitted\n\nHello ${data.assigneeName || data.managerName || ''},\n\nA new request has been submitted:\n\nTitle: ${data.requestTitle}\nSubmitted by: ${data.requesterName}${data.subDepartment ? `\nRequest Type: ${data.subDepartment}` : ''}${data.priority ? `\nPriority: ${data.priority}` : ''}\n\nView details: ${data.requestUrl || appUrl + '/requests'}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    case 'request_comment_reply':
      return {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            ${emailHeader}
            <h2 style="color: #2563eb;">New Update on Your Request 💬</h2>
            <p>Hello ${data.requesterName},</p>
            <p>There's a new update on your request from ${data.commenterName}:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.requestTitle}</h3>
              <p style="color: #666; font-size: 14px; margin-bottom: 10px;"><strong>From:</strong> ${data.commenterName}</p>
              <div style="background-color: #ffffff; padding: 15px; border-left: 3px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; white-space: pre-wrap;">${data.commentText}</p>
              </div>
            </div>
            
            <p style="text-align: center; margin-top: 30px;">
              <a href="${data.requestUrl || appUrl + '/requests?request=' + data.requestId}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Request & Reply</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">You can view the full request details and respond by clicking the button above.</p>
            <p>Best regards,<br>CrowdHub Team</p>
            ${emailFooter(data.requestId, data.requestNumber)}
          </div>
        `,
        text: `New Update on Your Request\n\nHello ${data.requesterName},\n\nThere's a new update on your request: ${data.requestTitle}\n\nFrom: ${data.commenterName}\nMessage:\n${data.commentText}\n\nView and reply: ${data.requestUrl || appUrl + '/requests?request=' + data.requestId}\n\nReference: ${data.requestNumber || data.requestId}\n\nBest regards,\nCrowdHub Team`
      };

    default:
      throw new Error(`Unknown email template: ${template}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, template, data }: EmailRequest = await req.json();
    
    const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
    const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN") || "mg.crowdhub.app";
    
    console.log('Using Mailgun domain:', mailgunDomain);
    console.log('API key exists:', !!mailgunApiKey);
    
    if (!mailgunApiKey) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    // Generate approval token for request_submitted emails
    if (template === 'request_submitted' && data.managerEmail) {
      data.approvalToken = await generateApprovalToken(data.requestId, data.managerEmail);
    }

    const emailContent = getEmailTemplate(template, data);
    
    const formData = new FormData();
    formData.append("from", "Vision Radiology Hub <hub@visionradiology.com.au>");
    formData.append("to", to);
    formData.append("subject", subject);

    // Prepare HTML and try to attach logo inline; fall back to public URL(s) if fetch fails
    let html = emailContent.html;
    try {
      const storageLogoUrl = 'https://znpjdrmvjfmneotdhwdo.supabase.co/storage/v1/object/public/company-assets/crowdhub-logo.png';
      const appLogoUrl = 'https://hub.visionradiology.com.au/crowdhub-logo.png';

      let logoResp = await fetch(storageLogoUrl);
      if (logoResp.ok) {
        const logoBlob = await logoResp.blob();
        // Attach as inline so <img src="cid:crowdhub-logo.png"> works
        formData.append('inline', logoBlob, 'crowdhub-logo.png');
      } else {
        // Try app public asset
        logoResp = await fetch(appLogoUrl);
        if (logoResp.ok) {
          const logoBlob = await logoResp.blob();
          formData.append('inline', logoBlob, 'crowdhub-logo.png');
        } else {
          // Fallback to URL replacement
          html = html.replace('cid:crowdhub-logo.png', appLogoUrl);
        }
      }
    } catch (e) {
      const appLogoUrl = 'https://hub.visionradiology.com.au/crowdhub-logo.png';
      html = html.replace('cid:crowdhub-logo.png', appLogoUrl);
      console.warn('Inline logo fetch failed, using URL fallback');
    }

    formData.append("html", html);
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
      console.error("Response headers:", Object.fromEntries(response.headers.entries()));
      throw new Error(`Mailgun API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
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