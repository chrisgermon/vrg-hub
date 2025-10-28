export type UserRole = 'super_admin' | 'tenant_admin' | 'manager' | 'marketing_manager' | 'requester' | 'marketing';

export type RequestStatus = 
  | 'submitted'
  | 'in_progress'
  | 'completed';

export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface HardwareRequest {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  description?: string;
  business_justification: string;
  clinic_name?: string;
  priority: RequestPriority;
  status: RequestStatus;
  total_amount?: number;
  currency: string;
  expected_delivery_date?: string;
  manager_id?: string;
  manager_approved_at?: string;
  manager_approval_notes?: string;
  admin_id?: string;
  admin_approved_at?: string;
  admin_approval_notes?: string;
  declined_by?: string;
  declined_at?: string;
  decline_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestItem {
  id: string;
  request_id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  vendor?: string;
  model_number?: string;
  specifications?: any;
  created_at: string;
}

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  content_type?: string;
  uploaded_by: string;
  attachment_type: string;
  created_at: string;
}

export interface RequestStatusHistory {
  id: string;
  request_id: string;
  status: RequestStatus;
  changed_by: string;
  notes?: string;
  created_at: string;
}
