const AMOUNT_REGEX = /(\d{1,3}(?:[\.\s]\d{3})*(?:,\d+)?|\d+(?:[\.,]\d+)?)(?:\s*(k|mil|m|mi|milhao|milhão|milhoes|milhões))?/i;

function normalizeAmountToken(rawToken: string): number {
  let token = rawToken.replace(/\s+/g, '');

  if (token.includes(',') && token.includes('.')) {
    token = token.replace(/\./g, '').replace(',', '.');
  } else if (token.includes(',')) {
    token = token.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(token)) {
    token = token.replace(/\./g, '');
  }

  return Number(token);
}

function getAmountMultiplier(rawSuffix?: string): number {
  const suffix = (rawSuffix || '').toLowerCase();

  if (['k', 'mil'].includes(suffix)) {
    return 1_000;
  }

  if (['m', 'mi', 'milhao', 'milhão', 'milhoes', 'milhões'].includes(suffix)) {
    return 1_000_000;
  }

  return 1;
}

export function extractFirstAmountFromText(text: string): number | null {
  const amountMatch = text.match(AMOUNT_REGEX);

  if (!amountMatch) {
    return null;
  }

  const baseAmount = normalizeAmountToken(amountMatch[1]);
  if (!Number.isFinite(baseAmount)) {
    return null;
  }

  return baseAmount * getAmountMultiplier(amountMatch[2]);
}

export function parseAmountLike(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const extracted = extractFirstAmountFromText(trimmed.toLowerCase());
    return extracted === null ? undefined : extracted;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}
