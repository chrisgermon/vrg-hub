/**
 * Format a request ID with the VRG prefix
 * @param requestNumber - The sequential request number
 * @returns Formatted request ID (e.g., "VRG-00001")
 */
export function formatRequestId(requestNumber: number | string): string {
  if (!requestNumber) return '';
  const num = typeof requestNumber === 'string' ? parseInt(requestNumber, 10) : requestNumber;
  return `VRG-${String(num).padStart(5, '0')}`;
}

/**
 * Format a request ID for display in compact spaces
 * @param requestNumber - The sequential request number
 * @returns Short formatted request ID (e.g., "VRG-1")
 */
export function formatRequestIdShort(requestNumber: number | string): string {
  if (!requestNumber) return '';
  const num = typeof requestNumber === 'string' ? parseInt(requestNumber, 10) : requestNumber;
  return `VRG-${num}`;
}

/**
 * Extract primary text from a structured description object
 */
const extractPrimaryFromObject = (obj: any): string | null => {
  if (!obj || typeof obj !== 'object') return null;
  const primary = (obj as any).field_description ?? (obj as any).description ?? (obj as any).details ?? (obj as any).justification ?? null;
  if (Array.isArray(primary)) return primary.join(', ');
  if (primary != null) {
    const str = String(primary).trim();
    if (str.length) return str;
  }
  return null;
};

/**
 * Clean email content by removing signatures, disclaimers, and CID references
 * This is a frontend safety net for existing records
 */
export function cleanEmailContent(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // Remove [cid:...] image references
  cleaned = cleaned.replace(/\[cid:[^\]]+\]/gi, '');
  
  // Split by lines and detect signature blocks
  const lines = cleaned.split('\n');
  const cleanedLines: string[] = [];
  let inSignature = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect signature start
    if (!inSignature && (
      line.match(/^[-_]{2,}$/) || // Separator lines
      line.match(/^(regards|thanks|sincerely|best|cheers)/i) || // Common closings
      line.match(/\|\s*[\w\s]+$/i) || // Job titles with pipe
      line.includes('accepts no liability') || // Legal disclaimers
      line.match(/^\d+\/\d+.*VIC \d{4}/) || // Addresses
      line.match(/\(\d{2}\)\s*\d{4}\s*\d{4}/) // Phone numbers
    )) {
      inSignature = true;
    }
    
    if (!inSignature && line.length > 0) {
      cleanedLines.push(lines[i]);
    }
  }
  
  // Rejoin and clean excessive whitespace
  let result = cleanedLines.join('\n').trim();
  result = result
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .trim();
  
  return result || cleaned.trim(); // Fallback if cleaning removed everything
}

/**
 * Convert a stored description (possibly JSON) into displayable text
 */
export function getDescriptionText(input: any, isEmail: boolean = false): string {
  if (!input) return '';
  
  // Clean email content if this is from an email source
  const processedInput = isEmail && typeof input === 'string' ? cleanEmailContent(input) : input;
  
  try {
    const raw = typeof processedInput === 'string' ? JSON.parse(processedInput) : processedInput;
    if (raw && typeof raw === 'object') {
      const primary = extractPrimaryFromObject(raw);
      if (primary) return isEmail ? cleanEmailContent(primary) : primary;
      const entries = Object.entries(raw).filter(([k, v]) =>
        !['field_title','title','description','details','field_description','business_justification'].includes(k) &&
        v !== null && v !== undefined && String(v).trim() !== ''
      );
      if (entries.length) {
        return entries
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join('\n');
      }
      return '';
    }
  } catch {
    // Not JSON, fall through
  }
  return String(processedInput);
}
