export function generateSearchTokens(text: string, maxTokens = 20): string[] {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  const tokens = new Set<string>();
  for (let i = 1; i <= Math.min(normalized.length, maxTokens); i++) {
    tokens.add(normalized.substring(0, i)); // Prefix tokens
  }
  return [...tokens];
}
