let counter = 0;

/**
 * Generate a short, unique card-level identifier.
 * Uses timestamp + counter to avoid collisions within the same session.
 */
export function generateCardId() {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/**
 * Ensure every item in an array has an `id` field.
 * Existing IDs are preserved; missing ones are generated.
 */
export function ensureCardIds(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => (item.id ? item : { ...item, id: generateCardId() }));
}

/**
 * Convert a legacy photos array (plain URL strings) into
 * the new format: [{id, url}].  Already-migrated entries are preserved.
 */
export function migratePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((entry) => {
    if (typeof entry === 'string') {
      return { id: generateCardId(), url: entry };
    }
    if (entry && typeof entry === 'object' && entry.url) {
      return entry.id ? entry : { ...entry, id: generateCardId() };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Extract plain URL array from the new photo format
 * (for backward-compatible display when needed).
 */
export function photoUrls(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
}

/**
 * Get the first photo URL from a profile's photos array,
 * handling both legacy (string[]) and new ({id,url}[]) formats.
 */
export function firstPhotoUrl(photos, fallback = null) {
  if (!Array.isArray(photos) || photos.length === 0) return fallback;
  const first = photos[0];
  if (typeof first === 'string') return first;
  return first?.url || fallback;
}
