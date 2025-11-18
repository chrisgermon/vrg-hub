import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  path: string;
  url: string;
  id: string;
}

export async function uploadRequestAttachment(
  file: File,
  requestId: string,
  userId: string
): Promise<UploadResult> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${requestId}/${fileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('request-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  // Store metadata in request_attachments table
  const { data: attachmentData, error: dbError } = await supabase
    .from('request_attachments')
    .insert({
      request_id: requestId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: userId,
      attachment_type: 'document'
    })
    .select()
    .single();

  if (dbError) throw dbError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('request-attachments')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: publicUrl,
    id: attachmentData.id
  };
}

export async function deleteRequestAttachment(attachmentId: string): Promise<void> {
  // Get file path first
  const { data: attachment } = await supabase
    .from('request_attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single();

  if (!attachment) return;

  // Delete from storage
  await supabase.storage
    .from('request-attachments')
    .remove([attachment.file_path]);

  // Delete from database
  await supabase
    .from('request_attachments')
    .delete()
    .eq('id', attachmentId);
}

export function getUserFriendlyError(error: any): string {
  const ERROR_MESSAGES: Record<string, string> = {
    'new row violates row-level security': 'You don\'t have permission to perform this action. Please contact your administrator.',
    'duplicate key value': 'A request with this information already exists.',
    'foreign key violation': 'Invalid selection. Please refresh and try again.',
    'not null violation': 'Please fill in all required fields.',
    'Network request failed': 'Unable to connect. Please check your internet connection and try again.',
    'Failed to fetch': 'Network error. Please check your connection and try again.',
    'storage/unauthorized': 'You don\'t have permission to upload files.',
    'storage/object-too-large': 'File is too large. Maximum size is 50MB.',
  };

  const errorMessage = error?.message || error?.toString() || '';
  
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}
