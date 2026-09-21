/**
 * services/api.js
 *
 * Thin mock data layer.  Every function returns a Promise so that
 * swapping this file for real fetch() calls in iteration two is a
 * one-line change per call-site — no component logic needs to change.
 *
 * Data entities match the PRD schema:
 *   User   { id, name, email, transport[], route, times[], interests[], joinedPodIds[] }
 *   Pod    { id, name, type, transport, members, timeWindow, newPosts, active, preview, route }
 *   Post   { id, podId, authorId, authorName, initials, avatarColor, avatarText,
 *             type, text, tag, tagColor, tagText, likes, comments, liked, time, isAlert, isOfficial }
 *   SafetyAlert { id, severity, title, detail, meta, reportCount }
 *   Spot   { id, name, category, dist, sub, iconBg, iconColor, verified, rating, lat, lng }
 */

// ─── Seed data ────────────────────────────────────────────────────────────────

const PODS = [
  {
    id: 1, name: 'Midrand → Wits', type: 'Route-based · Gautrain',
    transport: 'gautrain', members: 14, timeWindow: '7:30–9am',
    newPosts: 3, active: true,
    preview: '"8:04 packed — wait for 8:22" · Thandiwe, 12m ago',
    route: { from: 'Midrand Station', to: 'Wits University' },
  },
  {
    id: 2, name: 'Wits Campus Students', type: 'Interest-based · Students',
    transport: 'gautrain', members: 31, timeWindow: 'All day',
    newPosts: 7, active: true,
    preview: '"Library open early Friday?" · Kagiso, 1h ago',
    route: null,
  },
];

const DISCOVER_PODS = [
  { id: 3, name: 'Pretoria CBD Evening',       type: 'Route · 5–7pm',          members: 9,  match: 68, filterType: 'route'    },
  { id: 4, name: 'Centurion 8am Commuters',    type: 'Time-based · Gautrain',   members: 22, match: 74, filterType: 'time'     },
  { id: 5, name: 'Joburg Tech Workers',        type: 'Interest · Technology',   members: 45, match: 81, filterType: 'interest' },
  { id: 6, name: 'Noord St Bus Regulars',      type: 'Stop-based · Bus',        members: 12, match: 55, filterType: 'stop'     },
];

const POSTS = [
  {
    id: 1, podId: 1, authorId: 'u2', authorName: 'Thandiwe N.',
    initials: 'TN', avatarColor: '#C7EF4E', avatarText: '#003310',
    type: 'delays', text: '8:04 Gautrain is completely packed. Standing room only on platform 3. Suggest you wait for the 8:22.',
    tag: 'Delay', tagColor: '#FEE2E2', tagText: '#B91C1C',
    likes: 14, comments: 3, liked: false, time: '12 min ago', isAlert: false, isOfficial: false,
  },
  {
    id: 2, podId: 1, authorId: 'system', authorName: 'Safety alert',
    initials: '!', avatarColor: '#EF4444', avatarText: '#fff',
    type: 'safety', text: 'Unsafe conditions reported at Noord Street stop after 10pm. Poor lighting, isolated platform. 4 independent reports. Avoid if possible.',
    tag: 'Safety', tagColor: '#FEE2E2', tagText: '#B91C1C',
    likes: 22, comments: 8, liked: true, time: '38 min ago', isAlert: true, isOfficial: false,
  },
  {
    id: 3, podId: 1, authorId: 'u3', authorName: 'Boland M.',
    initials: 'BM', avatarColor: '#F59E0B', avatarText: '#412402',
    type: 'community', text: 'Station Deli at Midrand is open early today — flat white for R35, opens 6:45am.',
    tag: 'Tip', tagColor: '#DCFCE7', tagText: '#065F46',
    likes: 9, comments: 2, liked: false, time: '18 min ago', isAlert: false, isOfficial: false,
  },
  {
    id: 4, podId: 1, authorId: 'u4', authorName: 'Kagiso D.',
    initials: 'KD', avatarColor: '#3B8BD4', avatarText: '#042C53',
    type: 'crowd', text: 'High crowd levels on Platform 3 right now. Staff deployed. Use Platform 2 if you need the 8:04.',
    tag: 'Crowd', tagColor: '#FEF3C7', tagText: '#B45309',
    likes: 18, comments: 5, liked: false, time: '28 min ago', isAlert: false, isOfficial: false,
  },
  {
    id: 5, podId: 2, authorId: 'u1', authorName: 'Lerato N.',
    initials: 'LN', avatarColor: '#C7EF4E', avatarText: '#003310',
    type: 'community', text: 'Library group study at 12pm today — anyone heading to Wits after the 9am?',
    tag: 'Meetup', tagColor: '#EDE8D8', tagText: '#085420',
    likes: 6, comments: 4, liked: false, time: '1 hr ago', isAlert: false, isOfficial: false,
  },
  {
    id: 6, podId: 1, authorId: 'official', authorName: 'Autopax (official)',
    initials: 'AP', avatarColor: '#1E293B', avatarText: '#fff',
    type: 'delays', text: 'Route 14A bus delayed approximately 25 minutes due to an accident on the N1 southbound. Alternative: Route 14B from Church Square departs 09:15 on time.',
    tag: 'Official', tagColor: '#E6F1FB', tagText: '#185FA5',
    likes: 31, comments: 11, liked: false, time: '8 min ago', isAlert: false, isOfficial: true,
  },
];

const SAFETY_ALERTS = [
  {
    id: 1, severity: 'danger', reportCount: 4,
    title: 'Unsafe area — Noord Street stop',
    detail: 'Unsafe conditions reported after 10pm. Poor lighting and isolated platform. Avoid late-night travel here.',
    meta: '4 community reports · 38 min ago',
  },
  {
    id: 2, severity: 'warning', reportCount: 2,
    title: 'Overcrowding — Platform 3, Midrand',
    detail: 'Platform 3 is at capacity for the 8:04 service. Staff deployed. Use Platform 2 as an alternative.',
    meta: '2 reports · 12 min ago',
  },
  {
    id: 3, severity: 'success', reportCount: 0,
    title: 'Safe zone — Wits Main Gate',
    detail: 'Security guard present 6am–10pm. Well-lit, CCTV coverage. Community verified 3 days ago.',
    meta: 'Community verified · 3 days ago',
  },
];

const SAFE_TIPS = [
  { id: 1, text: 'Travel in groups after 9pm where possible, especially at Noord Street and Park Station.' },
  { id: 2, text: 'Platform 2 at Midrand is well-lit and monitored — prefer it over Platform 3 during busy hours.' },
  { id: 3, text: 'Share your commute pod location with a trusted contact when travelling late.' },
  { id: 4, text: 'Gautrain security can be reached at the helpdesk on Platform 1 at all major stations.' },
];

const SPOTS = [
  { id: 1, name: 'Station Deli',                category: 'food',   dist: '80m',              sub: 'Opens 7am · Coffee from R35',     iconBg: '#FEF3C7', iconColor: '#B45309', verified: false, saved: true,  rating: 4.6, lat: -25.9983, lng: 28.1440 },
  { id: 2, name: 'Wits Main Gate',              category: 'safe',   dist: '~40 km via Gautrain', sub: 'Security 6am–10pm · Well-lit', iconBg: '#DCFCE7', iconColor: '#065F46', verified: true,  saved: false, rating: null, lat: -26.1929, lng: 28.0305 },
  { id: 3, name: 'Pick n Pay Express — Midrand', category: 'stores', dist: '120m',             sub: '24hrs · ATM on site',             iconBg: '#E6F1FB', iconColor: '#185FA5', verified: false, saved: false, rating: 4.2, lat: -25.9970, lng: 28.1418 },
  { id: 4, name: 'Wits Library',                category: 'study',  dist: '~40 km · campus',  sub: 'Free WiFi · Study rooms',         iconBg: '#EDE8D8', iconColor: '#085420', verified: true,  saved: true,  rating: 4.8, lat: -26.1920, lng: 28.0320 },
  { id: 5, name: 'Midrand Platform 2 Safe Zone', category: 'safe',  dist: 'Midrand station',  sub: 'Community verified · CCTV',       iconBg: '#DCFCE7', iconColor: '#065F46', verified: true,  saved: false, rating: null, lat: -25.9990, lng: 28.1430 },
  { id: 6, name: 'Centurion Mall Work Lounge',  category: 'study',  dist: 'Centurion station', sub: 'WiFi · Plugs · Coffee bar',      iconBg: '#EEEDFE', iconColor: '#534AB7', verified: false, saved: false, rating: 4.4, lat: -25.8605, lng: 28.1894 },
];

// ─── In-memory state (simulates a DB table) ───────────────────────────────────

let _posts         = [...POSTS];
let _safetyAlerts  = [...SAFETY_ALERTS];
let _safeTips      = [...SAFE_TIPS];
let _userPodIds    = [1, 2];           // pods the current user has joined
let _savedSpotIds  = [1, 4];           // spots the user has saved
let _nextPostId    = 100;
let _nextReportId  = 200;

// Pending safety reports — must reach REPORT_THRESHOLD before becoming a public alert
const REPORT_THRESHOLD = 3;
let _pendingReports = [];   // { id, type, location, details, count }

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getProfile() {
  await delay();
  const raw = localStorage.getItem('rm_profile');
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function saveProfile(profile) {
  await delay();
  localStorage.setItem('rm_profile', JSON.stringify(profile));
  return profile;
}

// ─── Pods ─────────────────────────────────────────────────────────────────────

export async function getMyPods() {
  await delay();
  const profile = JSON.parse(localStorage.getItem('rm_profile') || '{}');
  const ids = profile.joinedPodIds ?? _userPodIds;
  return PODS.filter(p => ids.includes(p.id));
}

export async function getDiscoverPods() {
  await delay();
  return DISCOVER_PODS;
}

export async function joinPod(podId) {
  await delay();
  const profile = JSON.parse(localStorage.getItem('rm_profile') || '{}');
  const ids = new Set(profile.joinedPodIds ?? _userPodIds);
  ids.add(podId);
  profile.joinedPodIds = [...ids];
  localStorage.setItem('rm_profile', JSON.stringify(profile));
  _userPodIds = [...ids];
  return { success: true };
}

export async function leavePod(podId) {
  await delay();
  const profile = JSON.parse(localStorage.getItem('rm_profile') || '{}');
  const ids = new Set(profile.joinedPodIds ?? _userPodIds);
  ids.delete(podId);
  profile.joinedPodIds = [...ids];
  localStorage.setItem('rm_profile', JSON.stringify(profile));
  _userPodIds = [...ids];
  return { success: true };
}

export async function createPod(podData) {
  await delay(200);
  const newPod = {
    id: Date.now(),
    name: podData.name,
    type: `${podData.type ?? 'Route'}-based`,
    transport: podData.transport?.[0] ?? 'gautrain',
    members: 1,
    timeWindow: podData.timeWindow ?? 'Custom',
    newPosts: 0,
    active: true,
    preview: 'You created this pod — be the first to post!',
    route: { from: podData.from ?? '', to: podData.to ?? '' },
  };
  PODS.push(newPod);
  await joinPod(newPod.id);
  return newPod;
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export async function getFeed(type = 'all') {
  await delay();
  if (type === 'all') return _posts;
  return _posts.filter(p => p.type === type);
}

export async function createPost(postData) {
  await delay(150);
  const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
  const name = auth.name ?? 'You';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const newPost = {
    id: _nextPostId++,
    podId: 1,
    authorId: 'me',
    authorName: name,
    initials,
    avatarColor: '#C7EF4E',
    avatarText: '#003310',
    type: postData.type ?? 'community',
    text: postData.text,
    tag: postData.type === 'delays' ? 'Delay'
       : postData.type === 'safety' ? 'Safety'
       : postData.type === 'crowd'  ? 'Crowd'
       : 'Post',
    tagColor: postData.type === 'delays' ? '#FEE2E2'
            : postData.type === 'safety' ? '#FEE2E2'
            : postData.type === 'crowd'  ? '#FEF3C7'
            : '#EDE8D8',
    tagText: postData.type === 'delays' ? '#B91C1C'
           : postData.type === 'safety' ? '#B91C1C'
           : postData.type === 'crowd'  ? '#B45309'
           : '#085420',
    likes: 0, comments: 0, liked: false,
    time: 'Just now', isAlert: false, isOfficial: false,
  };
  _posts = [newPost, ..._posts];
  return newPost;
}

export async function toggleLike(postId) {
  await delay(60);
  _posts = _posts.map(p => {
    if (p.id !== postId) return p;
    const liked = !p.liked;
    return { ...p, liked, likes: p.likes + (liked ? 1 : -1) };
  });
  return _posts.find(p => p.id === postId);
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export async function getSafetyAlerts() {
  await delay();
  return _safetyAlerts;
}

export async function getSafeTips() {
  await delay();
  return _safeTips;
}

/**
 * Submit a safety report.
 * The REPORT_THRESHOLD (3) must be reached before the report becomes
 * a public alert — this is the gate described in the PRD.
 */
export async function submitSafetyReport(reportData) {
  await delay(200);
  const key = `${reportData.type}::${reportData.location}`;
  const existing = _pendingReports.find(r => r.key === key);

  if (existing) {
    existing.count += 1;
    if (existing.count >= REPORT_THRESHOLD) {
      // Promote to public alert
      const newAlert = {
        id: _nextReportId++,
        severity: reportData.type === 'unsafe' ? 'danger' : 'warning',
        reportCount: existing.count,
        title: `${reportData.type === 'unsafe' ? 'Unsafe area' : 'Concern reported'} — ${reportData.location}`,
        detail: reportData.details || 'Community-reported concern. Exercise caution.',
        meta: `${existing.count} reports · Just now`,
      };
      _safetyAlerts = [newAlert, ..._safetyAlerts];
      _pendingReports = _pendingReports.filter(r => r.key !== key);
      return { promoted: true, threshold: REPORT_THRESHOLD, alert: newAlert };
    }
    return { promoted: false, count: existing.count, remaining: REPORT_THRESHOLD - existing.count };
  }

  _pendingReports.push({ key, ...reportData, count: 1 });
  return { promoted: false, count: 1, remaining: REPORT_THRESHOLD - 1 };
}

export async function addSafeTip(text) {
  await delay(100);
  const tip = { id: Date.now(), text };
  _safeTips = [..._safeTips, tip];
  return tip;
}

// ─── Discover / Spots ─────────────────────────────────────────────────────────

export async function getSpots() {
  await delay();
  return SPOTS.map(s => ({ ...s, saved: _savedSpotIds.includes(s.id) }));
}

export async function toggleSaveSpot(spotId) {
  await delay(60);
  if (_savedSpotIds.includes(spotId)) {
    _savedSpotIds = _savedSpotIds.filter(id => id !== spotId);
    return { saved: false };
  }
  _savedSpotIds = [..._savedSpotIds, spotId];
  return { saved: true };
}

export async function addSpot(spotData) {
  await delay(150);
  const newSpot = {
    id: Date.now(),
    ...spotData,
    verified: false,
    saved: true,
    rating: null,
  };
  SPOTS.push(newSpot);
  _savedSpotIds.push(newSpot.id);
  return newSpot;
}