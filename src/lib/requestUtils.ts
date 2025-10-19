/**
 * Format a request ID with the VRG prefix
 * @param id - The UUID of the request
 * @returns Formatted request ID (e.g., "VRG-00537")
 */
export function formatRequestId(id: string): string {
  if (!id) return '';
  // Convert first 8 chars of UUID to a number and mod by 100000 to get 5 digits
  const hexPart = id.slice(0, 8);
  const numericValue = parseInt(hexPart, 16) % 100000;
  const paddedNumber = numericValue.toString().padStart(5, '0');
  return `VRG-${paddedNumber}`;
}

/**
 * Format a request ID for display in compact spaces
 * @param id - The UUID of the request
 * @returns Short formatted request ID (e.g., "VRG-537")
 */
export function formatRequestIdShort(id: string): string {
  if (!id) return '';
  // Same as full format but without leading zeros
  const hexPart = id.slice(0, 8);
  const numericValue = parseInt(hexPart, 16) % 100000;
  return `VRG-${numericValue}`;
}
