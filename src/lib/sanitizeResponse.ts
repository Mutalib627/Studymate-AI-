/**
 * Strip ALL markdown symbols from AI responses so raw syntax never appears
 * in the UI — regardless of whether content is loaded fresh, from DB, or
 * after navigation/remount.
 */
export function sanitizeResponse(input: string): string {
  if (!input) return "";

  // Preserve structured JSON payloads (tables/images) used by ChatMessageRenderer
  const trimmed = input.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    trimmed.startsWith("```json")
  ) {
    return input;
  }

  return input
    // fenced code blocks → keep inner text
    .replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, "$1")
    // inline code
    .replace(/`([^`]+)`/g, "$1")
    // images ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // links [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // headings  ###### Heading
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    // horizontal rules --- *** ___
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, "")
    // blockquote  >
    .replace(/^\s{0,3}>\s?/gm, "")
    // bold/italic ***text*** **text** *text* __text__ _text_
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1$2")
    // list bullets - * + → •
    .replace(/^\s{0,3}[-*+]\s+/gm, "• ")
    // numbered lists keep number, drop trailing period style markdown spacing artifacts
    .replace(/^\s{0,3}(\d+)\.\s+/gm, "$1. ")
    // tidy excess blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
