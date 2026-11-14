/**
 * services/supabaseApi.js — the real backend implementation.
 *
 * services/api.js is the only file the components import. When Supabase is
 * configured it delegates here; otherwise it uses the local mock. Function
 * names and return shapes match the mock, so no component changes when the
 * backend is swapped.
 */
import { supabase } from '../lib/Supabase';
import { rankPods } from './podMatch';

const MIRROR_KEYS = ['rm_auth', 'rm_profile', 'rm_onboarded'];

function client() {
  if (!supabase) {
    throw new Error('Supabase is not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).');
  }
  return supabase;
}

/** Supabase returns { data, error } instead of throwing — turn errors into real Errors. */
function unwrap({ data, error }) {
  if (error) throw Object.assign(new Error(error.message || 'Request failed'), { code: error.code });
  return data;
}

async function sessionUser() {
  const { data, error } = await client().auth.getSession();
  if (error) throw new Error(error.message);
  return data.session?.user ?? null;
}

async function requireUserId() {
  const user = await sessionUser();
  if (!user) throw new Error('You are signed out. Please log in again.');
  return user.id;
}

// ── Row <-> app-shape mapping ────────────────────────────────────────────────

export function rowToProfile(row = {}) {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    transport: row.transport ?? [],
    route: {
      from: row.route_from ?? '',
      to: row.route_to ?? '',
      fromPlace: row.route_from_place ?? null,
      toPlace: row.route_to_place ?? null,
    },
    times: row.commute_times ?? [],
    interests: row.interests ?? [],
    privacy: row.privacy ?? 'public',
    onboarded: Boolean(row.onboarded),
    joinedPodIds: [],
  };
}

/**
 * App profile -> DB columns. Only keys that are actually present are written,
 * so saving a partial profile (e.g. onboarding has no name) never blanks
 * existing data. Email is never written from the client — the signup trigger
 * owns it.
 */
export function profileToRow(profile = {}) {
  const row = {};
  const set = (key, value) => { if (value !== undefined) row[key] = value; };
  set('name', profile.name);
  set('transport', profile.transport);
  set('route_from', profile.route?.from);
  set('route_to', profile.route?.to);
  set('route_from_place', profile.route?.fromPlace);
  set('route_to_place', profile.route?.toPlace);
  set('commute_times', profile.times);
  set('interests', profile.interests);
  set('privacy', profile.privacy);
  set('onboarded', profile.onboarded);
  return row;
}

export function rowToPod(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    transport: row.transport,
    members: row.member_count ?? 0,
    timeWindow: row.time_window,
    route: row.route_from || row.route_to ? { from: row.route_from, to: row.route_to } : null,
    interestTags: row.interest_tags ?? [],
    filterType: row.filter_type,
    active: true,
    newPosts: 0,   // posts are not in the database yet
    preview: '',
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const sb = client();
  const user = await sessionUser();
  if (!user) return null;

  const [profileRes, memberRes] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    sb.from('pod_members').select('pod_id').eq('user_id', user.id),
  ]);
  const row = unwrap(profileRes);
  const members = unwrap(memberRes);
  return {
    ...rowToProfile(row ?? { id: user.id, email: user.email }),
    joinedPodIds: (members ?? []).map(m => m.pod_id),
  };
}

export async function saveProfile(profile) {
  const id = await requireUserId();
  unwrap(await client().from('profiles').upsert({ id, ...profileToRow(profile) }));
  return getProfile();
}

/** Save everything collected in onboarding and mark the user as onboarded. */
export async function completeOnboarding(profile) {
  const sb = client();
  const id = await requireUserId();

  unwrap(await sb.from('profiles').upsert({ id, ...profileToRow(profile), onboarded: true }));

  const podIds = profile.joinedPodIds ?? [];
  if (podIds.length > 0) {
    unwrap(await sb.from('pod_members').upsert(
      podIds.map(pod_id => ({ pod_id, user_id: id })),
      { onConflict: 'pod_id,user_id', ignoreDuplicates: true },
    ));
  }
  return getProfile();
}

// ── Pods ─────────────────────────────────────────────────────────────────────

async function listPods() {
  const rows = unwrap(await client().from('pods_with_counts').select('*').order('id'));
  return (rows ?? []).map(rowToPod);
}

export async function getMyPods() {
  const sb = client();
  const id = await requireUserId();
  const members = unwrap(await sb.from('pod_members').select('pod_id').eq('user_id', id));
  const ids = (members ?? []).map(m => m.pod_id);
  if (ids.length === 0) return [];
  const rows = unwrap(await sb.from('pods_with_counts').select('*').in('id', ids));
  return (rows ?? []).map(rowToPod);
}

export async function getDiscoverPods() {
  const profile = await getProfile();
  const joined = new Set(profile?.joinedPodIds ?? []);
  const pods = (await listPods()).filter(p => !joined.has(p.id));
  return rankPods(pods, profile);
}

/** Suggestions for onboarding, scored against the answers given so far. */
export async function getSuggestedPods(profile, limit = 3) {
  const user = await sessionUser();
  let joined = new Set();
  if (user) {
    const members = unwrap(await client().from('pod_members').select('pod_id').eq('user_id', user.id));
    joined = new Set((members ?? []).map(m => m.pod_id));
  }
  const pods = (await listPods()).filter(p => !joined.has(p.id));
  return rankPods(pods, profile, limit);
}

export async function joinPod(podId) {
  const id = await requireUserId();
  unwrap(await client().from('pod_members').upsert(
    { pod_id: Number(podId), user_id: id },
    { onConflict: 'pod_id,user_id', ignoreDuplicates: true },
  ));
  return { success: true };
}

export async function leavePod(podId) {
  const id = await requireUserId();
  unwrap(await client().from('pod_members').delete().eq('pod_id', Number(podId)).eq('user_id', id));
  return { success: true };
}

export async function createPod(podData) {
  const id = await requireUserId();
  const row = unwrap(await client().from('pods').insert({
    name: podData.name,
    type: 'Route-based',
    transport: podData.transport?.[0] ?? 'gautrain',
    time_window: podData.timeWindow ?? null,
    filter_type: 'route',
    route_from: podData.from ?? null,
    route_to: podData.to ?? null,
    created_by: id,
  }).select().single());
  await joinPod(row.id);
  return { ...rowToPod({ ...row, member_count: 1 }), preview: 'You created this pod — be the first to post!' };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

function friendlyAuthError(error) {
  const message = error?.message ?? '';
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first — check your inbox.';
  if (/already registered|already been registered/i.test(message)) {
    return 'An account with this email already exists. Try logging in.';
  }
  if (/password should be at least/i.test(message)) return 'Password must be at least 6 characters.';
  return message || 'Something went wrong. Please try again.';
}

/**
 * The rest of the app reads rm_auth / rm_onboarded from localStorage (guards,
 * greeting, chat name). We keep those in step with the real session so none
 * of those components needed to change.
 */
export async function syncLocalMirror(user) {
  const profile = await getProfile().catch(() => null);
  const name = profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || '';
  localStorage.setItem('rm_auth', JSON.stringify({ id: user.id, name, email: user.email }));
  if (profile?.onboarded) localStorage.setItem('rm_onboarded', 'true');
  else localStorage.removeItem('rm_onboarded');
  return { onboarded: Boolean(profile?.onboarded) };
}

export function clearLocalMirror() {
  MIRROR_KEYS.forEach(key => localStorage.removeItem(key));
}

export async function signUp({ name, email, password }) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(friendlyAuthError(error));
  // With "Confirm email" enabled in Supabase there is no session until the link is clicked.
  if (!data.session) return { needsConfirmation: true, onboarded: false };
  const { onboarded } = await syncLocalMirror(data.user);
  return { needsConfirmation: false, onboarded };
}

export async function signIn({ email, password }) {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyAuthError(error));
  return syncLocalMirror(data.user);
}

export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw new Error(friendlyAuthError(error));
  return { redirected: true }; // the browser is navigating to Google
}

export async function signOut() {
  const { error } = await client().auth.signOut();
  clearLocalMirror();
  if (error) throw new Error(error.message);
}

export function onAuthChange(callback) {
  const { data } = client().auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function requestPasswordReset(email) {
  const { error } = await client().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw new Error(friendlyAuthError(error));
}