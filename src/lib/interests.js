/**
 * Interest options for user profiles
 * Each interest has a unique id and display name
 */
export const INTERESTS = [
  { id: 'travel', name: 'Travel' },
  { id: 'music', name: 'Music' },
  { id: 'movies', name: 'Movies' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'cooking', name: 'Cooking' },
  { id: 'reading', name: 'Reading' },
  { id: 'gaming', name: 'Gaming' },
  { id: 'photography', name: 'Photography' },
  { id: 'art', name: 'Art' },
  { id: 'sports', name: 'Sports' },
  { id: 'hiking', name: 'Hiking' },
  { id: 'dancing', name: 'Dancing' },
  { id: 'coffee', name: 'Coffee' },
  { id: 'wine', name: 'Wine' },
  { id: 'dogs', name: 'Dogs' },
  { id: 'cats', name: 'Cats' },
  { id: 'yoga', name: 'Yoga' },
  { id: 'meditation', name: 'Meditation' },
];

/**
 * Get interest name by id
 * @param {string} id - Interest id
 * @returns {string} Interest name or the id if not found
 */
export function getInterestName(id) {
  const interest = INTERESTS.find(i => i.id === id);
  return interest ? interest.name : id;
}

/**
 * Get multiple interest names by ids
 * @param {string[]} ids - Array of interest ids
 * @returns {string[]} Array of interest names
 */
export function getInterestNames(ids) {
  return ids.map(getInterestName);
}
