export interface ParsedNotes {
  emails: string[];
  isrcs: string[];
  upcs: string[];
  label_info: string | null;
  urls: string[];
  description: string | null;
}

export function parseNotes(raw: string | null): ParsedNotes | null {
  if (!raw || !raw.trim()) return null;

  let text = raw;
  const emails: string[] = [];
  const isrcs: string[] = [];
  const upcs: string[] = [];
  const urls: string[] = [];
  let labelInfo: string | null = null;

  // Extract emails
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const match of text.matchAll(emailRe)) {
    emails.push(match[0]);
  }
  text = text.replace(emailRe, '');

  // Extract ISRCs (hyphenated or compact)
  const isrcRe = /\b[A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5}\b/g;
  for (const match of text.matchAll(isrcRe)) {
    isrcs.push(match[0]);
  }
  text = text.replace(isrcRe, '');

  // Extract URLs
  const urlRe = /https?:\/\/[^\s)]+/g;
  for (const match of text.matchAll(urlRe)) {
    urls.push(match[0]);
  }
  text = text.replace(urlRe, '');

  // Extract UPC codes (12-13 digits standalone)
  const upcRe = /\b\d{12,13}\b/g;
  for (const match of text.matchAll(upcRe)) {
    upcs.push(match[0]);
  }
  text = text.replace(upcRe, '');

  // Extract label info
  const labelRe = /(?:LABEL(?:\s*RELEASE)?|Label|Distributed\s+by|Distribution)\s*:\s*([^\n|]+)/gi;
  const labelMatch = labelRe.exec(raw);
  if (labelMatch) {
    labelInfo = labelMatch[1].trim();
    text = text.replace(labelMatch[0], '');
  }

  // Clean up remaining text
  text = text
    .replace(/ISRC\s*:/gi, '')
    .replace(/UPC\s*:/gi, '')
    .replace(/\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[,;.\-]\s*/gm, '')
    .trim();

  const description = text.length > 10 ? text : null;

  return {
    emails: [...new Set(emails)],
    isrcs: [...new Set(isrcs)],
    upcs: [...new Set(upcs)],
    label_info: labelInfo,
    urls: [...new Set(urls)],
    description,
  };
}
