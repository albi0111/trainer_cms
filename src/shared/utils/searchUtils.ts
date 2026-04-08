export function generateSearchTokens(text: string, maxTokens = 20): string[] {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  const words = normalized.split(' ');
  const tokens = new Set<string>();

  // Full string prefixes (e.g. "john", "john ", "john d"...)
  for (let i = 1; i <= Math.min(normalized.length, maxTokens); i++) {
    tokens.add(normalized.substring(0, i));
  }

  // individual word prefixes (e.g. "doe", "do", "d")
  // Only add if we haven't hit the cap
  words.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      if (tokens.size >= maxTokens) break;
      tokens.add(word.substring(0, i));
    }
  });

  return [...tokens];
}
