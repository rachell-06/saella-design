// Display helpers shared by more than one screen (2026-11-09). Add here instead of copying into a screen.

/** Masked like the registry API does before unlock: first letter + domain. */
export function maskEmail(e: string) {
  const [user, domain] = e.split("@");
  return `${user?.[0] ?? ""}•••@${domain ?? ""}`;
}
