/**
 * Build a display name from first_name and optional last_name.
 * Falls back to 'Unknown' when no name is available.
 */
export function getDisplayName(profile) {
  const first = profile?.first_name?.trim();
  const last = profile?.last_name?.trim();
  if (!first) return 'Unknown';
  return last ? `${first} ${last}` : first;
}
