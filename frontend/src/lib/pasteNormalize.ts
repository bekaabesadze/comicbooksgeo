/**
 * Normalize pasted text so it uses the comic font (normal.ttf) for both Georgian and Latin.
 * - Unicode NFC normalization: pasted text (e.g. from Google Docs) is often in NFD form,
 *   which can cause Georgian letters to render with a fallback font; NFC fixes that.
 * - Latin punctuation (smart quotes, dashes, etc.) is normalized so the font doesn’t fall back.
 * Georgian letters are left unchanged.
 */
export function normalizePastedText(text: string): string {
  if (!text) return text;
  const nfc = text.normalize('NFC');
  return (
    nfc
      // Smart/curly quotes → straight quotes
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
      // En/em dash → hyphen
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '-')
      // Unicode spaces → normal space
      .replace(/\u00A0/g, ' ')
      .replace(/[\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
      .replace(/\u2026/g, '...')
  );
}

export interface PasteNormalizeOptions {
  value: string;
  onChange: (newValue: string) => void;
  normalize?: (text: string) => string;
}

/**
 * Returns an onPaste handler for controlled inputs/textareas that inserts
 * plain, normalized text at the cursor so the comic font stays consistent.
 * Use onPasteCapture so we run before any other handler and always prevent default paste.
 */
export function usePasteNormalize({ value, onChange, normalize = normalizePastedText }: PasteNormalizeOptions) {
  return (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const pasted = e.clipboardData?.getData?.('text/plain');
    if (pasted == null) return;

    e.preventDefault();
    e.stopPropagation();
    const normalized = normalize(pasted);
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + normalized + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      target.focus();
      const newCursor = start + normalized.length;
      target.setSelectionRange(newCursor, newCursor);
    });
  };
}
