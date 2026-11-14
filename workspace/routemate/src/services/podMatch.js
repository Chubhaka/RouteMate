/**
 * Pod matching — a transparent 0–100 score, no randomness and no invented
 * numbers. Used by onboarding's "suggested pods" and the Discover tab.
 *
 *   transport matches the pod's transport ........ 30
 *   boarding stop matches the pod's start ......... 20
 *   destination matches the pod's end ............. 20
 *   shared interests (15 each, capped) ............ 30
 */
const norm = value => (value ?? '').toString().trim().toLowerCase();

// Words too generic to prove two places are the same ("Station", "Street"…).
const STOP_WORDS = new Set([
  'station', 'stop', 'street', 'road', 'avenue', 'drive', 'university', 'campus', 'the', 'and', 'of',
]);
const words = value =>
  new Set(norm(value).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3 && !STOP_WORDS.has(w)));

// "Midrand Gautrain Station, Midrand, Gauteng" matches a pod starting at "Midrand Station"
// because they share the distinctive word "midrand".
function placesOverlap(userText, podText) {
  const user = words(userText);
  for (const word of words(podText)) if (user.has(word)) return true;
  return false;
}

export function scorePod(pod, profile) {
  let score = 0;
  const transport = profile?.transport ?? [];
  if (pod.transport && transport.includes(pod.transport)) score += 30;
  if (placesOverlap(profile?.route?.from, pod.route?.from)) score += 20;
  if (placesOverlap(profile?.route?.to, pod.route?.to)) score += 20;

  const interests = new Set(profile?.interests ?? []);
  const shared = (pod.interestTags ?? []).filter(tag => interests.has(tag)).length;
  score += Math.min(30, shared * 15);
  return score;
}

/** Score, then order by match, then popularity, then name. */
export function rankPods(pods, profile, limit) {
  const ranked = pods
    .map(pod => ({ ...pod, match: scorePod(pod, profile) }))
    .sort((a, b) =>
      b.match - a.match ||
      (b.members ?? 0) - (a.members ?? 0) ||
      a.name.localeCompare(b.name));
  return limit ? ranked.slice(0, limit) : ranked;
}