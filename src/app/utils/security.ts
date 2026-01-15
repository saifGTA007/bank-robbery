export function sanitizeInput(input: string, maxLength: number = 20): string {
  // 1. Remove HTML tags (XSS protection)
  let sanitized = input.replace(/<[^>]*>?/gm, '');

  // 2. Remove common SQL injection characters
  sanitized = sanitized.replace(/['";\-\-]/g, '');

  // 3. Trim length
  return sanitized.slice(0, maxLength).trim();
}

export function isSafeNumber(val: any): boolean {
  // Ensure it's a number, not an object/string, and not too huge
  return typeof val === 'number' && !isNaN(val) && isFinite(val) && val < 1000000000;
}

export function getFriendlyError(error: any): string {
  // WebAuthn specific cancellations
  if (error.name === 'NotAllowedError') return 'Process cancelled by user.';
  if (error.name === 'InvalidStateError') return 'This device is already registered.';
  if (error.name === 'NotSupportedError') return 'Biometrics not supported on this browser.';
  
  // Server-side / Network issues
  if (error.message.includes('429')) return 'Too many attempts. Slow down!';
  if (error.message.includes('423')) return 'Account temporarily locked (5 mins).';

  // Fallback for everything else (Hacker-proof)
  return 'An unexpected error occurred. Please try again later.';
}