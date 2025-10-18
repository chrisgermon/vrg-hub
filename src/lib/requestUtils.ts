/**
 * Format a request ID with the VRG prefix
 * @param id - The UUID of the request
 * @returns Formatted request ID (e.g., "VRG-A1B2C3D4")
 */
export function formatRequestId(id: string): string {
  if (!id) return '';
  // Take first 8 characters of UUID and format as VRG-XXXXXXXX
  return `VRG-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Format a request ID for display in compact spaces
 * @param id - The UUID of the request
 * @returns Short formatted request ID (e.g., "VRG-A1B2")
 */
export function formatRequestIdShort(id: string): string {
  if (!id) return '';
  // Take first 4 characters of UUID for very compact display
  return `VRG-${id.slice(0, 4).toUpperCase()}`;
}
