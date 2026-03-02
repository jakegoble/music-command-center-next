export interface ParsedNotes {
  emails: string[];
  isrcs: string[];
  upcs: string[];
  label_info: string | null;
  urls: string[];
  track_listing: string[];
  splits_info: string | null;
  description: string | null;
}

export function parseNotes(raw: string | null): ParsedNotes | null {
  if (!raw || !raw.trim()) return null;

  let text = raw;
  const emails: string[] = [];
  const isrcs: string[] = [];
  const upcs: string[] = [];
  const urls: string[] = [];
  const trackListing: string[] = [];
  let labelInfo: string | null = null;
  let splitsInfo: string | null = null;

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

  // Extract track listings FIRST — "Contains: 1. Track Name ISRC, 2. Track Name ISRC, ..."
  // Must run before label extraction since label regex can over-capture into Contains section
  const containsRe = /Contains\s*:\s*([\s\S]*?)(?=\.\s*(?:Has |Splits?\s|$)|\s*$)/gi;
  const containsMatch = containsRe.exec(text);
  if (containsMatch) {
    const trackStr = containsMatch[1];
    // Split on numbered entries: "1. Track, 2. Track, ..."
    const trackEntries = trackStr.split(/,\s*(?=\d+\.)/).map(t => t.trim()).filter(Boolean);
    for (const entry of trackEntries) {
      // Strip leading "1. " numbering, trailing ISRC codes, and trailing periods
      const cleaned = entry
        .replace(/^\d+\.\s*/, '')
        .replace(/\s+[A-Z]{2}[A-Z0-9]{3}\d{5,7}\s*$/, '')
        .replace(/\.\s*$/, '')
        .trim();
      if (cleaned) trackListing.push(cleaned);
    }
    text = text.replace(containsMatch[0], '');
  }

  // Extract "Splits with:" or "Splits:" sections (remove entirely — data is in emails array)
  const splitsRe = /Splits?\s+with\s*:\s*[^\n]*/gi;
  text = text.replace(splitsRe, '');

  // Strip "Has Discovery Pack" and similar metadata flags
  text = text.replace(/Has\s+Discovery\s+Pack\.?/gi, '');

  // Extract label info — stop at period, comma, or "Contains"
  const labelRe = /(?:Record\s+)?(?:LABEL(?:\s*RELEASE)?|Label)\s*:\s*([^.,\n]+)/gi;
  const labelMatch = labelRe.exec(text);
  if (labelMatch) {
    labelInfo = labelMatch[1].trim();
    text = text.replace(labelMatch[0], '');
  }
  if (!labelInfo) {
    const distRe = /(?:Distributed\s+by|Distribution)\s*:\s*([^.,\n]+)/gi;
    const distMatch = distRe.exec(text);
    if (distMatch) {
      labelInfo = distMatch[1].trim();
      text = text.replace(distMatch[0], '');
    }
  }

  // Clean up remaining text — strip metadata fragments
  text = text
    .replace(/ISRC\s*:/gi, '')
    .replace(/UPC\s*:\s*\d{12,13}/gi, '')
    .replace(/UPC\s*:/gi, '')
    .replace(/\d+-track\s+(?:album|EP|single|collection)\.?/gi, '')
    .replace(/Released\s+[A-Za-z]+\s+\d{1,2},?\s*\d{4}\.?/gi, '')
    .replace(/Record\s+Label\s*:/gi, '')
    .replace(/\|/g, ' ')
    .replace(/\s*-\s*(?=\s|$)/g, ' ')
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
    track_listing: trackListing,
    splits_info: splitsInfo,
    description,
  };
}
