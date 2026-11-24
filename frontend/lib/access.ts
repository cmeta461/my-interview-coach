import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Passcode gate. Set ACCESS_PASSCODE to require a passcode before anyone can start an
 * interview. After a correct passcode, the server sets a signed, httpOnly cookie that
 * /api/token checks.
 *
 * - Production with no ACCESS_PASSCODE: the token route refuses to work (fail closed).
 * - Development with no ACCESS_PASSCODE: open, for local convenience.
 */
export const ACCESS_COOKIE = 'ic_access';
export const ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getPasscode(): string | undefined {
  const p = process.env.ACCESS_PASSCODE;
  return p && p.length > 0 ? p : undefined;
}

export function isGateRequired(): boolean {
  return getPasscode() !== undefined;
}

/** True when nobody configured a passcode and we're not in development. */
export function isMisconfigured(): boolean {
  return !isGateRequired() && process.env.NODE_ENV === 'production';
}

function sign(passcode: string): string {
  // Key on the passcode itself plus the LiveKit secret, so changing either invalidates cookies.
  const key = `${passcode}:${process.env.LIVEKIT_API_SECRET ?? ''}`;
  return createHmac('sha256', key).update('interview-coach-unlocked').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passcodeMatches(candidate: string): boolean {
  const passcode = getPasscode();
  if (!passcode) return false;
  // Compare HMACs so lengths always match and timing doesn't leak the passcode.
  return safeEqual(sign(candidate), sign(passcode));
}

export function createAccessCookieValue(): string {
  return sign(getPasscode() ?? '');
}

export function hasValidAccess(cookieValue: string | undefined): boolean {
  const passcode = getPasscode();
  if (!passcode) return !isMisconfigured();
  if (!cookieValue) return false;
  return safeEqual(cookieValue, sign(passcode));
}
