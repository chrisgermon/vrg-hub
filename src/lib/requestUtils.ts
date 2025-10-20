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
