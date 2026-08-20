export function extractPincode(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

export function normalizeAreaName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
