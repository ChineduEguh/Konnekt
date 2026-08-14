export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) &&
    !/^https?:\/\//i.test(trimmed)
  ) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
