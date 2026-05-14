// Client-side access gate. The actual authoritative allowlist lives server-side
// in `supabase/functions/_shared/auth.ts` and is also enforced by disabling
// public sign-ups at the auth provider. This client check is a UX hint only —
// it does not list authorized identities to avoid disclosing the access model
// in the public JS bundle. Any session that survives sign-up restrictions and
// passes Supabase auth is allowed to attempt requests; the server is the
// source of truth and will reject unauthorized callers.
export const isAllowedEmail = (email: string | null | undefined): boolean => {
  return !!email;
};
