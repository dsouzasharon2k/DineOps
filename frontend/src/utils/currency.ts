/**
 * Formats a price in paise as Indian Rupee string.
 * @param paise - Amount in paise (smallest currency unit)
 * @returns Formatted string e.g. "₹299.00"
 */
export function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`
}
