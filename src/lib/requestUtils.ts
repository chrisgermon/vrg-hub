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
 * Convert a stored description (possibly JSON) into displayable text
 */
export function getDescriptionText(input: any): string {
  if (!input) return '';
  try {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    if (raw && typeof raw === 'object') {
      const primary = extractPrimaryFromObject(raw);
      if (primary) return primary;
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
  return String(input);
}
