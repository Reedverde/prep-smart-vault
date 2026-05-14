// Hard allowlist for sign-in. Only these emails can hold a session.
// Adding more emails here is the only way to grant access.
export const ALLOWED_EMAILS = ["reed@everde.co"] as const;

export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase().trim() as typeof ALLOWED_EMAILS[number]);
};
