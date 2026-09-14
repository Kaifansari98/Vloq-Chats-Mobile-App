export type MessageTextPart = { text: string; url?: string; hostname?: string };

/** Keep punctuation as message text and allow only browser-safe HTTP(S) links. */
export function splitMessageLinks(content: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  const pattern = /(?:https?:\/\/|www\.)[^\s<>"\u201c\u201d]+/gi;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const start = match.index!;
    if (start > 0 && /[\w@]/.test(content[start - 1])) continue;
    let text = match[0].replace(/[.,!?;:]+$/, '');
    // Preserve balanced URL parentheses, but leave surrounding prose punctuation outside.
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (text.endsWith(close) && text.split(close).length > text.split(open).length) text = text.slice(0, -1);
    }
    text = text.replace(/[.,!?;:]+$/, '');
    try {
      const url = new URL(/^www\./i.test(text) ? `https://${text}` : text);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
      if (start > cursor) parts.push({ text: content.slice(cursor, start) });
      parts.push({ text, url: url.href, hostname: url.hostname });
      cursor = start + text.length;
    } catch { /* Invalid candidates remain ordinary message text. */ }
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });
  return parts;
}
