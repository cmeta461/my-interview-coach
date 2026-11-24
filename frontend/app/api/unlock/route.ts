import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_MAX_AGE_SECONDS,
  createAccessCookieValue,
  hasValidAccess,
  isGateRequired,
  passcodeMatches,
} from '@/lib/access';

export const revalidate = 0;

/** Tells the UI whether a passcode is needed and whether this browser already has access. */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({
    required: isGateRequired(),
    unlocked: hasValidAccess(jar.get(ACCESS_COOKIE)?.value),
  });
}

/** Checks the passcode and, if correct, sets the access cookie. */
export async function POST(req: Request) {
  if (!isGateRequired()) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({}));
  const candidate = typeof body?.passcode === 'string' ? body.passcode.trim() : '';

  if (!passcodeMatches(candidate)) {
    // Small delay to slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ ok: false, error: 'Incorrect passcode' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, createAccessCookieValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });
  return res;
}
