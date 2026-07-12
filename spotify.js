// Spotify account connection via Authorization Code + PKCE (no server needed).
// SETUP (one time): create a free app at https://developer.spotify.com/dashboard,
// copy its Client ID here, and add this page's URL as a Redirect URI.
const SPOTIFY_CLIENT_ID = ''; // <-- fill in after registering the app
const SPOTIFY_SCOPES = 'playlist-modify-public playlist-modify-private';
const REDIRECT_URI = location.origin + location.pathname;

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256(str) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); }
function randomStr(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); }

async function spotifyLogin() {
  if (!SPOTIFY_CLIENT_ID) {
    alert('כדי לחבר את החשבון צריך הגדרה חד-פעמית (5 דקות):\n1. להיכנס ל-developer.spotify.com/dashboard\n2. ליצור אפליקציה (חינם) ולהעתיק את ה-Client ID\n3. להוסיף את כתובת האתר כ-Redirect URI\nתגיד לי כשיש לך Client ID ואשלים את החיבור.');
    return false;
  }
  const verifier = randomStr(64);
  const challenge = b64url(await sha256(verifier));
  sessionStorage.setItem('sp_verifier', verifier);
  const p = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SPOTIFY_SCOPES, code_challenge_method: 'S256', code_challenge: challenge,
  });
  location.href = 'https://accounts.spotify.com/authorize?' + p.toString();
  return true;
}

async function spotifyToken() {
  let tok = sessionStorage.getItem('sp_token');
  if (tok) return tok;
  return null;
}

async function spotifyHandleRedirect() {
  const code = new URLSearchParams(location.search).get('code');
  if (!code) return;
  const verifier = sessionStorage.getItem('sp_verifier');
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID, grant_type: 'authorization_code', code,
    redirect_uri: REDIRECT_URI, code_verifier: verifier,
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const data = await res.json();
  if (data.access_token) {
    sessionStorage.setItem('sp_token', data.access_token);
    history.replaceState({}, '', REDIRECT_URI);
    const pending = sessionStorage.getItem('sp_pending');
    if (pending) { sessionStorage.removeItem('sp_pending'); const p = JSON.parse(pending); spotifyCreatePlaylist(p.name, p.ids); }
  }
}

async function spotifyCreatePlaylist(name, ids) {
  let tok = await spotifyToken();
  if (!tok) {
    sessionStorage.setItem('sp_pending', JSON.stringify({ name, ids }));
    spotifyLogin();
    return;
  }
  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  try {
    const me = await (await fetch('https://api.spotify.com/v1/me', { headers: H })).json();
    const pl = await (await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: 'POST', headers: H, body: JSON.stringify({ name, description: 'נוצר מרשימת ה-Shazam שלי', public: false }),
    })).json();
    for (let i = 0; i < ids.length; i += 100) {
      const uris = ids.slice(i, i + 100).map(id => 'spotify:track:' + id);
      await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks`, { method: 'POST', headers: H, body: JSON.stringify({ uris }) });
    }
    if (confirm(`✅ נוצר פלייליסט "${name}" עם ${ids.length} שירים! לפתוח בספוטיפיי?`)) window.open(pl.external_urls.spotify, '_blank');
  } catch (e) {
    sessionStorage.removeItem('sp_token');
    alert('החיבור פג. נסה שוב.');
  }
}
