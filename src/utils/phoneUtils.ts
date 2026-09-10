/**
 * Phone Number Normalization & Matching Utilities for ERROREN CHAT
 * Ensures consistent WhatsApp-style phone identification, lookup, and duplicate prevention.
 */

/**
 * Strips all non-digit characters except an optional leading plus sign (+).
 */
export function cleanPhoneDigits(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

/**
 * Normalizes phone number into standard canonical E.164-style format.
 * E.g. '03399951515' -> '+923399951515'
 * E.g. '0339 1342008' -> '+923391342008'
 * E.g. '+92-339-9951515' -> '+923399951515'
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode = '+92'): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Pakistan local 11-digit numbers starting with 03xx
  if (/^03\d{9}$/.test(cleaned)) {
    const code = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    return `${code}${cleaned.substring(1)}`;
  }

  // Standard 10-digit US/North America numbers
  if (/^[2-9]\d{9}$/.test(cleaned) && defaultCountryCode === '+1') {
    return `+1${cleaned}`;
  }

  // If already starting with country digits (e.g. 923399951515)
  if (cleaned.startsWith('923') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // Generic fallback: if starts with 0 and has >= 10 digits
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    const code = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    return `${code}${cleaned.substring(1)}`;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Returns all plausible phone number string variants for database lookups.
 * Guaranteed to match regardless of whether the account was registered with
 * '03399951515', '+923399951515', or '923399951515'.
 */
export function getPhoneLookupVariants(raw: string, defaultCountryCode = '+92'): string[] {
  if (!raw) return [];
  const variants = new Set<string>();
  const trimmed = raw.trim();

  // 1. Raw trimmed
  variants.add(trimmed);

  // 2. Digits only
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits) {
    variants.add(digits);
  }

  // 3. E.164 normalized
  const normalized = normalizePhoneNumber(trimmed, defaultCountryCode);
  if (normalized) {
    variants.add(normalized);
    // Also without the +
    variants.add(normalized.replace(/^\+/, ''));
  }

  // 4. Pakistani local format if applicable (03xx)
  if (normalized.startsWith('+923') && normalized.length === 13) {
    const local = '0' + normalized.substring(3);
    variants.add(local);
    variants.add(normalized.substring(3)); // 3xx without country code or 0
  } else if (/^03\d{9}$/.test(digits)) {
    variants.add(digits);
    variants.add(`+92${digits.substring(1)}`);
    variants.add(`92${digits.substring(1)}`);
    variants.add(digits.substring(1));
  }

  // 5. Without leading zeroes
  const stripped = digits.replace(/^0+/, '');
  if (stripped) {
    variants.add(stripped);
  }

  return Array.from(variants).filter((v) => v.length >= 6);
}

/**
 * Checks if two phone numbers match, handling local vs international formatting.
 */
export function isPhoneMatch(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  if (phoneA.trim() === phoneB.trim()) return true;

  const cleanA = phoneA.replace(/[^0-9]/g, '');
  const cleanB = phoneB.replace(/[^0-9]/g, '');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;

  const strippedA = cleanA.replace(/^0+/, '');
  const strippedB = cleanB.replace(/^0+/, '');
  if (strippedA === strippedB) return true;

  // Suffix matching for country code variations (e.g. 923399951515 and 3399951515)
  if (strippedA.length >= 7 && strippedB.length >= 7) {
    if (strippedA.endsWith(strippedB)) {
      const diff = strippedA.length - strippedB.length;
      if (diff >= 1 && diff <= 4) return true;
    }
    if (strippedB.endsWith(strippedA)) {
      const diff = strippedB.length - strippedA.length;
      if (diff >= 1 && diff <= 4) return true;
    }
  }

  return false;
}

/**
 * Formats a phone number cleanly for UI display.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();

  // E.g. +923399951515 -> +92 339 9951515
  if (clean.startsWith('+92') && clean.length === 13) {
    return `+92 ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }

  // E.g. 03399951515 -> 0339 9951515
  if (/^03\d{9}$/.test(clean)) {
    return `${clean.substring(0, 4)} ${clean.substring(4)}`;
  }

  return clean;
}
