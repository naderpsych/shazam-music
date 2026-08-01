// Spotify: connect account (PKCE), play full tracks (Web Playback SDK, Premium),
// and create playlists. No server required.
//
// The Client ID is entered once by the user inside the page (setup dialog) and kept
// in localStorage, so nothing here needs to be hard-coded or redeployed.

const SP_SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'user-read-playback-state', 'user-modify-playback-state',
  'playlist-modify-public', 'playlist-modify-private',
].join(' ');

const SP_REDIRECT = location.origin + location.pathname;
const SP_ID_KEY = 'sp_client_id';
const SP_TOK_KEY = 'sp_tokens';

const spClientId = () => localStorage.getItem(SP_ID_KEY) || '';

// ---------- helpers ----------
function spB64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function spRandom(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return spB64(a); }

function spSaveTokens(d) {
  const cur = spTokens() || {};
  localStorage.setItem(SP_TOK_KEY, JSON.stringify({
    access: d.access_token,
    refresh: d.refresh_token || cur.refresh,
    expires: Date.now() + (d.expires_in || 3600) * 1000 - 60000,
  }));
}
function spTokens() { try { return JSON.parse(localStorage.getItem(SP_TOK_KEY)); } catch (e) { return null; } }
function spConnected() { const t = spTokens(); return !!(t && t.refresh); }
function spLogout() { localStorage.removeItem(SP_TOK_KEY); spUpdateUI(); }

// Always returns a valid access token, refreshing when needed.
async function spToken() {
  const t = spTokens();
  if (!t) return null;
  if (t.access && Date.now() < t.expires) return t.access;
  if (!t.refresh) return null;
  const body = new URLSearchParams({
    client_id: spClientId(), grant_type: 'refresh_token', refresh_token: t.refresh,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const d = await r.json();
  if (!d.access_token) { spLogout(); return null; }
  spSaveTokens(d);
  return d.access_token;
}

// ---------- login ----------
async function spLogin() {
  if (!spClientId()) { spShowSetup(); return; }
  const verifier = spRandom(64);
  const challenge = spB64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  localStorage.setItem('sp_verifier', verifier);
  location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: spClientId(), response_type: 'code', redirect_uri: SP_REDIRECT,
    scope: SP_SCOPES, code_challenge_method: 'S256', code_challenge: challenge,
  });
}

async function spHandleRedirect() {
  const p = new URLSearchParams(location.search);
  if (p.get('error')) { history.replaceState({}, '', SP_REDIRECT); alert('החיבור בוטל: ' + p.get('error')); return; }
  const code = p.get('code');
  if (!code) return;
  const verifier = localStorage.getItem('sp_verifier');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: spClientId(), grant_type: 'authorization_code', code,
      redirect_uri: SP_REDIRECT, code_verifier: verifier,
    }),
  });
  const d = await r.json();
  history.replaceState({}, '', SP_REDIRECT);
  if (d.access_token) { spSaveTokens(d); spUpdateUI(); spInitPlayer(); }
  else alert('החיבור נכשל. ודא שכתובת ה-Redirect URI בספוטיפיי היא בדיוק:\n' + SP_REDIRECT);
}

// ---------- setup dialog (one time) ----------
function spShowSetup() {
  const box = document.getElementById('spSetup');
  document.getElementById('spRedirectShow').textContent = SP_REDIRECT;
  document.getElementById('spIdInput').value = spClientId();
  box.style.display = 'flex';
}
function spSaveSetup() {
  const v = document.getElementById('spIdInput').value.trim();
  if (!/^[a-z0-9]{20,}$/i.test(v)) { alert('ה-Client ID לא נראה תקין (מחרוזת ארוכה של אותיות ומספרים).'); return; }
  localStorage.setItem(SP_ID_KEY, v);
  document.getElementById('spSetup').style.display = 'none';
  spLogin();
}

// ---------- Web Playback SDK (full tracks, Premium) ----------
let spPlayer = null, spDeviceId = null, spPremium = false, spOnEnd = null;

window.onSpotifyWebPlaybackSDKReady = () => { if (spConnected()) spInitPlayer(); };

async function spInitPlayer() {
  if (spPlayer || !window.Spotify || !spConnected()) return;
  const tok = await spToken();
  if (!tok) return;
  // Free accounts can't stream through the SDK — check before creating a player.
  const me = await (await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: 'Bearer ' + tok } })).json();
  spPremium = me.product === 'premium';
  spUpdateUI();
  if (!spPremium) return;

  spPlayer = new Spotify.Player({
    name: 'המוזיקה שלי (Shazam)',
    getOAuthToken: cb => spToken().then(cb),
    volume: 0.8,
  });
  spPlayer.addListener('ready', ({ device_id }) => { spDeviceId = device_id; spUpdateUI(); });
  spPlayer.addListener('not_ready', () => { spDeviceId = null; });
  spPlayer.addListener('authentication_error', () => { spLogout(); });
  spPlayer.addListener('account_error', () => { spPremium = false; spUpdateUI(); });
  let wasPlaying = false;
  spPlayer.addListener('player_state_changed', st => {
    if (!st) return;
    // track finished: position back to 0 while paused after having played
    if (st.paused && st.position === 0 && wasPlaying) { wasPlaying = false; if (spOnEnd) spOnEnd(); }
    else if (!st.paused) wasPlaying = true;
    if (typeof onSpPlaybackState === 'function') onSpPlaybackState(st);
  });
  spPlayer.connect();
}

async function spPlayUris(uris, offset) {
  const tok = await spToken();
  if (!tok || !spDeviceId) return false;
  const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spDeviceId}`, {
    method: 'PUT', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ uris: uris.slice(0, 300), offset: { position: offset || 0 } }),
  });
  return r.ok || r.status === 204;
}
async function spTogglePlay() { if (spPlayer) spPlayer.togglePlay(); }
async function spNextTrack() { if (spPlayer) spPlayer.nextTrack(); }
async function spPrevTrack() { if (spPlayer) spPlayer.previousTrack(); }

// ---------- create playlist ----------
async function spCreatePlaylist(name, ids) {
  const tok = await spToken();
  if (!tok) { spLogin(); return; }
  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  try {
    const me = await (await fetch('https://api.spotify.com/v1/me', { headers: H })).json();
    const pl = await (await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ name, description: 'נוצר מרשימת השאזאם שלי', public: false }),
    })).json();
    for (let i = 0; i < ids.length; i += 100) {
      await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ uris: ids.slice(i, i + 100).map(id => 'spotify:track:' + id) }),
      });
    }
    if (confirm(`✅ נוצר פלייליסט "${name}" עם ${ids.length} שירים!\nלפתוח בספוטיפיי?`)) {
      window.open(pl.external_urls.spotify, '_blank');
    }
  } catch (e) {
    alert('שגיאה ביצירת הפלייליסט. נסה להתחבר מחדש.');
  }
}
