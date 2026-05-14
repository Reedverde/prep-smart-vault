## Goal
Lock down authentication so only you can access PrepPi. No new accounts, no other Google users.

## Changes

### 1. Disable signup at the auth provider level
Call `configure_auth` with `disable_signup: true`. This blocks all new account creation server-side — both email/password and Google. Even if someone hits the API directly, Supabase will reject the signup.

### 2. Restrict Google sign-in to your email
Add an allowlist check after OAuth completes. The cleanest spot is in `useAuth.tsx` inside `onAuthStateChange`: if a session appears for an email that isn't yours, immediately `signOut()` and show a toast. This catches both Google and any stray account.

Allowed email: **reed@everde.co** (please confirm — see question below).

### 3. Clean up the Login page UI
- Remove the "Create account" toggle link.
- Remove the signup mode entirely (only sign-in remains).
- Keep "Forgot?" password reset (still useful for you).
- Keep Google + email/password buttons.

### 4. Optional hardening (recommended)
Enable HIBP leaked-password check via `configure_auth` (`password_hibp_enabled: true`) so your own password can't be a known-breached one.

## Files touched
- `src/pages/Login.tsx` — strip signup mode + UI
- `src/hooks/useAuth.tsx` — add email allowlist guard
- Auth config (via tool) — disable_signup + HIBP

## Not touched
No DB schema, no RLS, no panels, no edge functions.

## Question before I build
Confirm the allowed email is **reed@everde.co**? And should I hardcode it, or read from an env-style constant in a small `src/lib/allowlist.ts` file (easier to change later)?
