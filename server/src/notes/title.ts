const HEADING = /^#{1,6}\s+(.+)$/;
const MAX_LENGTH = 100;

/**
 * Derive a Note Title from its Body: the first heading's text, else the
 * first non-empty line. Returns null when nothing is derivable (so the
 * caller can keep the existing Title).
 */
export function deriveTitle(body: string): string | null {
  const lines = body.split("\n");

  for (const line of lines) {
    const heading = line.match(HEADING);
    if (heading) return clamp(heading[1]!.trim());
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return clamp(trimmed);
  }
  return null;
}

function clamp(text: string): string {
  return text.length > MAX_LENGTH ? text.slice(0, MAX_LENGTH) : text;
}
