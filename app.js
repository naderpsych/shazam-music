/* המוזיקה שלי — app logic.
   Library lives only in the browser: upload -> enrich -> classify -> render. */

// ---------- categories (index === CAT_ORDER index) ----------
const CATS = [
  { he: 'ישראלי',                 hue: 25,  instr: 'גיטרות',      icon: 'guitar' },
  { he: 'קלאסיקה ערבית (טרב)',    hue: 55,  instr: 'עוּד',        icon: 'music' },
  { he: 'פופ/אינדי ערבי מודרני',  hue: 85,  instr: 'דרבוקה',      icon: 'drum' },
  { he: 'שאנסון צרפתי',           hue: 118, instr: 'אקורדיון',    icon: 'radio' },
  { he: 'ג׳אז, בלוז וסול',        hue: 148, instr: 'סקסופון',     icon: 'music' },
  { he: 'קלאסיקות זהב',           hue: 178, instr: 'ויניל',       icon: 'disc' },
  { he: 'רוק ואלטרנטיבי',         hue: 208, instr: 'גיטרות',      icon: 'guitar' },
  { he: 'אינדי, פולק ובדרום',     hue: 245, instr: 'מיתרים',      icon: 'guitar' },
  { he: 'טכנו ואלקטרוני',         hue: 285, instr: 'סינתיסייזר',  icon: 'wave' },
  { he: 'היפ הופ ו־R&B',          hue: 322, instr: 'ביטים',       icon: 'mic' },
  { he: 'פופ מודרני',             hue: 352, instr: 'סינתים',      icon: 'headphones' },
];
const fill = i => `oklch(60% .12 ${CATS[i].hue})`;
const chipC = i => `oklch(45% .13 ${CATS[i].hue})`;
const outC = i => `oklch(35% .13 ${CATS[i].hue})`;

const DICT = [
  'הפופ הישראלי נולד מהמפגש בין להקות הצבא לרוק המערבי. הגיטרה החשמלית הגיעה לכאן באיחור של עשור — וכשהגיעה, היא התערבבה מיד עם מקצבים ים־תיכוניים.',
  'טרב הוא לא ז׳אנר אלא מצב: הרגע שבו הזמר והקהל נסחפים יחד. אום כולתום נהגה לשיר שיר אחד במשך שעה, וחוזרת על אותה שורה שוב ושוב בכל פעם במקאם אחר, עד שהקהל צעק.',
  'הדור הזה לקח את המקאם והכניס אותו לגיטרות ולסינתיסייזרים. להקות כמו משרוע לילה שרו בערבית על נושאים שנחשבו טאבו, וגילו שהקהל הצעיר בדיוק חיכה לזה.',
  'בשאנסון המילים קודמות למנגינה. הזמר לא חייב קול יפה — הוא חייב לספר סיפור. אדית פיאף התחילה לשיר ברחובות פריז, וזה נשמע בכל תו.',
  'הג׳אז המציא את הסווינג — התחושה שהתו מגיע קצת אחרי הזמן, ובדיוק זה מה שגורם לך להתנדנד. אי אפשר לכתוב את זה בתווים; או שמרגישים או שלא.',
  'לפני האולפנים הדיגיטליים הכל הוקלט בבת אחת, בחדר אחד. מה שאתה שומע זה נגנים אמיתיים שמנגנים יחד באותו רגע — כולל הטעויות שהחליטו להשאיר.',
  'הדיסטורשן נולד מתקלה. מגברים שרופים ורמקולים קרועים יצרו צליל מלוכלך שהמהנדסים ניסו לתקן — והנגנים דרשו לשמור עליו.',
  'בדרום־פופ נוצר בחדרי שינה עם מחשב נייד ומיקרופון זול. הצליל הביתי הזה — הרעש, החדר, הנשימה — הפך למאפיין מבוקש ולא לפגם שצריך להסתיר.',
  'טכנו בנוי על חזרתיות. אחרי כמה דקות המוח מפסיק לשאול ״מה הלאה״ ומתמסר לתבנית — וזה בדיוק האפקט שהממציאים בדטרויט חיפשו.',
  'ההמצאה הגדולה של ההיפ הופ הייתה להפוך את הפטיפון מכלי נגינה לכלי יצירה. הדי־ג׳יי בודד ארבע שניות של תופים משיר ישן וחזר עליהן בלולאה — וכך נולד הביט.',
  'הסוד הוא ה״הוק״ — משפט מלודי קצר שנועד להיתקע בראש. יש מוטיב אחד (Millennial Whoop) שחוזר במאות להיטים, ורוב האנשים לא שמים לב שהם כבר מכירים אותו.',
];

const MOODS = [
  { he: 'ספורט',  lbl: '128–165',      test: s => rng(s.b, 128, 165) || (s.e > 78 && s.b >= 120) },
  { he: 'רגוע',   lbl: '60–85',        test: s => rng(s.b, 60, 85) && (s.e == null || s.e < 55) },
  { he: 'נסיעה',  lbl: '95–120',       test: s => rng(s.b, 95, 120) },
  { he: 'מסיבה',  lbl: '118–140',      test: s => rng(s.b, 118, 140) && (s.d == null || s.d > 55) },
  { he: 'ריכוז',  lbl: 'אינסטרומנטלי', test: s => (s.ins > 30) || (s.sp != null && s.sp < 6 && s.e < 50) },
  { he: 'ערב',    lbl: '70–100',       test: s => rng(s.b, 70, 100) && (s.e == null || s.e < 62) },
];
const rng = (v, a, b) => v != null && v >= a && v <= b;

const ICONS = {
  guitar: '<path d="M11.9 12.1 20.5 3.5"/><path d="m13 5 6 6"/><circle cx="7.5" cy="16.5" r="5"/><circle cx="7.5" cy="16.5" r="1.5"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  drum: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/>',
  radio: '<rect x="2" y="8" width="20" height="12"/><circle cx="7" cy="14" r="2.5"/><path d="M16 12h3M16 16h3M5 8l13-5"/>',
  disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 0 20"/>',
  wave: '<path d="M2 12h2l2-6 3 14 3-10 2 4h6"/>',
  mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/>',
  headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="14" width="5" height="7"/><rect x="17" y="14" width="5" height="7"/>',
};
const svg = (name, size, sw) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="${sw || 1.6}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

// ---------- state ----------
const LIB_KEY = 'mm_library';
let LIB = [];
let query = '', filterCat = null, shown = 40;
let panelMode = 'category', selCat = null, selMood = null;
let queue = [], qi = -1, playing = false;

const $ = id => document.getElementById(id);
const esc = t => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = n => n.toLocaleString('en-US');

// ---------- upload ----------
function detectAndParse(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('empty');
  // Shazam's raw export puts the literal "Shazam Library" on line 1.
  let hi = 0;
  while (hi < rows.length && rows[hi].length < 3) hi++;
  const head = rows[hi].map(h => h.trim());
  const objs = rows.slice(hi + 1).map(r => { const o = {}; head.forEach((k, i) => o[k] = r[i]); return o; });
  const raw = head.includes('Title');
  const out = [];
  objs.forEach((o, n) => {
    const title = raw ? o.Title : o.Song;
    const artist = o.Artist;
    if (!title || !artist) return;
    const k = normKey(title, artist);
    const en = typeof ENRICH !== 'undefined' ? ENRICH[k] : null;
    let cat = en ? en[1] : -1;
    if (cat < 0) {
      const vote = typeof ARTIST_CAT !== 'undefined'
        ? ARTIST_CAT[normPart((artist || '').split(/,|&|feat/i)[0])] : undefined;
      cat = CAT_ORDER.indexOf(classify(raw ? { Song: title, Artist: artist } : o));
      if (cat === CAT_ORDER.indexOf(CAT_NAMES.POP) && vote !== undefined) cat = vote;
    }
    const numf = v => { const x = parseInt(v); return isNaN(x) ? null : x; };
    out.push({
      i: numf(raw ? o.Index : o['#']) || n + 1,
      t: ((raw ? o.TagTime : o['Added At']) || '').substring(0, 10) || null,
      s: title, a: artist,
      u: o.URL || '', k: o.TrackKey || '',
      c: cat < 0 ? 10 : cat,
      id: en ? en[0] : (o['Spotify Track Id'] || ''),
      e: en ? en[2] : numf(o.Energy), b: en ? en[3] : numf(o.BPM),
      v: en ? en[4] : numf(o.Valence), d: en ? en[5] : numf(o.Dance),
      ac: en ? en[6] : numf(o.Acoustic), ins: en ? en[7] : numf(o.Instrumental),
      sp: en ? en[8] : numf(o.Speech), dur: en ? en[9] : null,
      y: en ? en[10] : numf((o['Album Date'] || '').substring(0, 4)),
    });
  });
  return out;
}

function loadFile(file) {
  const err = $('upErr');
  err.hidden = true;
  if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
    err.textContent = 'זה לא נראה כמו קובץ CSV. נסה שוב עם הייצוא מ־Shazam.';
    err.hidden = false; return;
  }
  const r = new FileReader();
  r.onload = () => {
    let lib;
    try { lib = detectAndParse(r.result); } catch (e) { lib = []; }
    if (!lib.length) {
      err.textContent = 'לא נמצאו שירים בקובץ. ודא שזה הייצוא של Shazam.';
      err.hidden = false; return;
    }
    LIB = lib;
    try { localStorage.setItem(LIB_KEY, JSON.stringify(lib)); } catch (e) {}
    showApp();
  };
  r.readAsText(file);
}

// ---------- render ----------
function counts() {
  const c = new Array(11).fill(0);
  LIB.forEach(s => c[s.c]++);
  return c;
}

function renderStrip() {
  const c = counts(), tot = LIB.length;
  $('strip').innerHTML = (tot ? c : c.map(() => 1))
    .map((n, i) => `<i style="flex:${Math.max(n, 1)};background:${fill(i)}"></i>`).join('');
}

function showApp() {
  $('upload').hidden = true;
  $('app').hidden = false;
  renderAll();
}

function renderAll() {
  renderHero(); renderDonut(); renderDecades(); renderArtists();
  renderRepeats(); renderDict(); renderFilters(); renderRows();
  renderPanelCats(); renderPanelMoods(); renderSummary();
  $('goSub').textContent = `${nf(LIB.length)} שירים · דרך ספוטיפיי`;
  spUpdateUI();
}

function renderHero() {
  const c = counts();
  const order = c.map((n, i) => [i, n]).sort((a, b) => b[1] - a[1]);
  const t1 = order[0][0];
  let t2 = order[1][0];
  if (CATS[t2].instr === CATS[t1].instr && order[2]) t2 = order[2][0];
  $('hHead').innerHTML = `אתה בעיקר<br>${esc(CATS[t1].instr)}<br>ו${esc(CATS[t2].instr)}.`;
  $('hIcons').innerHTML = svg(CATS[t1].icon, 34) + svg(CATS[t2].icon, 34);

  const dates = LIB.map(s => s.t).filter(Boolean).sort();
  const y0 = dates.length ? dates[0].substring(0, 4) : '';
  const y1 = dates.length ? dates[dates.length - 1].substring(0, 4) : '';
  $('hRange').textContent = y0 && y1 ? `${y0} — ${y1}` : '';

  $('hSub').textContent =
    `${nf(order[0][1])} מהגילויים שלך הם ${CATS[t1].he}, ואחריהם ${CATS[t2].he}. ` +
    `זה מה שהאוזן שלך עוצרת בשבילו כשהיא לא מתכננת כלום.`;

  $('sTracks').textContent = nf(LIB.length);
  $('sArtists').textContent = nf(new Set(LIB.map(s => s.a)).size);
  const bpms = LIB.map(s => s.b).filter(Boolean);
  $('sBpm').textContent = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : '—';
}

function renderDonut() {
  const c = counts(), tot = LIB.length || 1;
  const order = c.map((n, i) => [i, n]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const C = 377, R = 60;
  let acc = 0;
  const segs = order.map(([i, n]) => {
    const len = n / tot * C;
    const s = `<circle r="${R}" cx="80" cy="80" fill="none" stroke="${fill(i)}" stroke-width="26"
      stroke-dasharray="${len.toFixed(2)} ${C}" stroke-dashoffset="${(-acc).toFixed(2)}"/>`;
    acc += len; return s;
  }).join('');
  $('donut').innerHTML = `<svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="התפלגות קטגוריות">
    <g transform="rotate(-90 80 80)">${segs}</g>
    <text x="80" y="82" text-anchor="middle" style="font:800 26px Archivo;fill:#201e1d">${nf(LIB.length)}</text>
    <text x="80" y="96" text-anchor="middle" style="font:500 10px Heebo;fill:#201e1d;opacity:.55">שאזאמים</text>
  </svg>`;
  $('legend').innerHTML = order.map(([i, n]) =>
    `<div><i style="background:${fill(i)}"></i><span class="nm">${esc(CATS[i].he)}</span><span class="ct num">${n}</span></div>`).join('');
}

function renderDecades() {
  const buckets = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const vals = buckets.map(() => 0);
  LIB.forEach(s => {
    if (!s.y) return;
    let d = Math.floor(s.y / 10) * 10;
    if (d < 1950) d = 1950; if (d > 2020) d = 2020;
    vals[buckets.indexOf(d)]++;
  });
  const W = 354, H = 110, max = Math.max(...vals, 1);
  const x = i => 8 + i * ((W - 16) / (buckets.length - 1));
  const y = v => 8 + (1 - v / max) * (H - 34);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  $('decades').innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="שירים לפי עשור">
    <line x1="0" y1="${H - 24}" x2="${W}" y2="${H - 24}" stroke="#201e1d" stroke-width="2"/>
    <polyline points="${pts}" fill="none" stroke="#201e1d" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${vals.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="#ec3013"/>`).join('')}
    ${buckets.map((b, i) => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle"
       style="font:700 9px Archivo;fill:#201e1d;opacity:.55">${String(b).slice(2)}s</text>`).join('')}
  </svg>`;
  const after = LIB.filter(s => s.y && s.y >= 2010).length;
  const before = LIB.filter(s => s.y && s.y < 1990).length;
  $('decCap').textContent = `${nf(after)} מהשירים שגילית יצאו אחרי 2010. אבל ${nf(before)} מהם יצאו לפני 1990.`;
}

function renderArtists() {
  const m = {};
  LIB.forEach(s => m[s.a] = (m[s.a] || 0) + 1);
  const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('artists').innerHTML = top.map(([name, n], i) => i < 2
    ? `<div><div class="n1">${esc(name)}</div><div class="c1 num">${n} שאזאמים</div></div>`
    : `<div><div class="n2">${esc(name)}</div><div class="c2 num">${n}</div></div>`).join('');
}

let repsOpen = false, repsAll = [];
function renderRepeats() {
  const m = {};
  LIB.forEach(s => { const k = normKey(s.s, s.a); (m[k] = m[k] || { s, n: 0 }).n++; });
  repsAll = Object.values(m).filter(x => x.n > 1).sort((a, b) => b.n - a.n);
  const list = repsOpen ? repsAll : repsAll.slice(0, 4);
  $('repeats').innerHTML = list.map(x =>
    `<div class="rep"><div class="x num">×${x.n}</div><div style="min-width:0">
      <div class="tt ell">${esc(x.s.s)}</div><div class="aa ell">${esc(x.s.a)}</div></div></div>`).join('')
    || '<div style="font-size:12px;opacity:.6;margin-top:10px">אין שירים חוזרים ברשימה.</div>';
  const rest = repsAll.length - 4;
  $('repExp').hidden = rest <= 0;
  $('repMore').textContent = repsOpen ? 'הצג פחות' : `עוד ${rest} שירים חוזרים`;
  $('repExp').classList.toggle('open', repsOpen);
}

let dictAll = false;
function renderDict() {
  const c = counts();
  const order = CATS.map((cat, i) => i).sort((a, b) => c[b] - c[a]);
  const list = dictAll ? order : order.slice(0, 5);
  $('dict').innerHTML = list.map(i => `
    <div class="item" data-i="${i}">
      <button class="q"><i style="background:${fill(i)}"></i><b>${esc(CATS[i].he)}</b><span class="num">${c[i]}</span></button>
      <div class="a">${esc(DICT[i])}</div>
    </div>`).join('') + (order.length > 5
      ? `<button class="thin" id="dictMore" style="border-bottom:none">
           <span>${dictAll ? 'הצג פחות' : `עוד ${order.length - 5} קטגוריות`}</span>
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" style="${dictAll ? 'transform:rotate(180deg)' : ''}"><path d="m6 9 6 6 6-6"/></svg>
         </button>` : '');
  $('dict').querySelectorAll('.item').forEach(el =>
    el.querySelector('.q').onclick = () => el.classList.toggle('open'));
  const more = $('dictMore');
  if (more) more.onclick = () => { dictAll = !dictAll; renderDict(); };
}

function renderFilters() {
  const c = counts();
  const chip = (label, active, color, on) =>
    `<button class="chip" data-c="${on}" style="${active
      ? `background:${color.bg};color:#fff;border-color:${color.bg}`
      : `border-color:${color.bd};color:${color.tx}`}">${esc(label)}</button>`;
  let html = chip('הכל', filterCat === null, { bg: '#201e1d', bd: 'rgba(32,30,29,.4)', tx: 'rgba(32,30,29,.75)' }, '');
  CATS.forEach((cat, i) => {
    if (!c[i]) return;
    html += chip(cat.he, filterCat === i, { bg: chipC(i), bd: chipC(i), tx: outC(i) }, i);
  });
  $('filters').innerHTML = html;
  $('filters').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    const v = b.dataset.c;
    filterCat = v === '' ? null : +v;
    shown = 40; renderFilters(); renderRows();
  });
}

function visible() {
  const q = query.trim().toLowerCase();
  return LIB.filter(s =>
    (filterCat === null || s.c === filterCat) &&
    (!q || s.s.toLowerCase().includes(q) || s.a.toLowerCase().includes(q)));
}

function renderRows() {
  const list = visible();
  $('q').placeholder = `${nf(LIB.length)} שירים. חפש אחד.`;
  if (!list.length) {
    $('rows').innerHTML = '<div class="empty">לא נמצאו שירים.</div>';
    $('moreBtn').hidden = true; return;
  }
  const cur = queue[qi];
  $('rows').innerHTML = list.slice(0, shown).map(s => {
    const isCur = cur && cur.s === s.s && cur.a === s.a;
    return `<div class="tr">
      <button class="pbtn ${isCur ? 'cur' : ''}" data-k="${esc(normKey(s.s, s.a))}" aria-label="נגן">
        <svg width="10" height="12" viewBox="0 0 14 16" fill="${isCur ? '#fff' : '#1DB954'}"><path d="M0 0v16l14-8z"/></svg>
      </button>
      <span class="cchip" style="background:${chipC(s.c)}">${esc(CATS[s.c].he)}</span>
      <div class="info"><div class="tt ell">${esc(s.s)}</div><div class="aa ell">${esc(s.a)}</div></div>
    </div>`;
  }).join('');
  $('moreBtn').hidden = list.length <= shown;
  $('rows').querySelectorAll('.pbtn').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    const idx = list.findIndex(s => normKey(s.s, s.a) === k);
    startPlay(list, Math.max(idx, 0));
  });
}

// ---------- play panel ----------
function renderPanelCats() {
  const c = counts();
  $('panelCats').innerHTML = CATS.map((cat, i) => c[i]
    ? `<button class="chip" data-i="${i}" style="${selCat === i
        ? `background:${chipC(i)};color:#fff;border-color:${chipC(i)}`
        : `border-color:${chipC(i)};color:${outC(i)}`}">${esc(cat.he)}</button>` : '').join('');
  $('panelCats').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    selCat = +b.dataset.i; renderPanelCats(); renderSummary();
  });
}
function renderPanelMoods() {
  $('panelMoods').innerHTML = MOODS.map((m, i) =>
    `<button class="mood ${selMood === i ? 'on' : ''}" data-i="${i}">
      <b>${esc(m.he)}</b><span class="num" dir="ltr">${esc(m.lbl)}</span></button>`).join('');
  $('panelMoods').querySelectorAll('.mood').forEach(b => b.onclick = () => {
    selMood = +b.dataset.i; renderPanelMoods(); renderSummary();
  });
}
function selection() {
  if (panelMode === 'category') {
    if (selCat === null) return { name: 'כל הספרייה', list: LIB.slice() };
    return { name: CATS[selCat].he, list: LIB.filter(s => s.c === selCat) };
  }
  if (selMood === null) return { name: 'כל הספרייה', list: LIB.slice() };
  return { name: MOODS[selMood].he, list: LIB.filter(MOODS[selMood].test) };
}
function renderSummary() {
  const { name, list } = selection();
  const secs = list.reduce((a, s) => a + (s.dur || 210), 0);
  const h = Math.floor(secs / 3600), m = Math.round(secs % 3600 / 60);
  $('selName').textContent = name;
  $('selMeta').textContent = `${nf(list.length)} שירים · ${h}:${String(m).padStart(2, '0')} שע׳`;
}

// ---------- playback ----------
function startPlay(list, index) {
  const playable = list.filter(s => s.id);
  if (!playable.length) { alert('לשירים האלה אין התאמה בספוטיפיי.'); return; }
  const target = list[index];
  let off = playable.findIndex(s => s === target);
  if (off < 0) off = 0;
  queue = playable; qi = off;
  if (!spConnected()) { sessionStorage.setItem('mm_pending', JSON.stringify({ ids: playable.map(s => s.id), off })); spLogin(); return; }
  pushToSpotify();
}
function shuffleAll() {
  const l = LIB.filter(s => s.id).slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  startPlay(l, 0);
}
async function pushToSpotify() {
  renderNowPlaying();
  const uris = queue.map(s => 'spotify:track:' + s.id);
  const ok = await spPlayUris(uris, qi);
  if (!ok) showEmbed();     // free account or SDK unavailable
  else { $('embed').style.display = 'none'; playing = true; renderNowPlaying(); }
}
function showEmbed() {
  const s = queue[qi]; if (!s) return;
  $('embedSlot').innerHTML = `<iframe src="https://open.spotify.com/embed/track/${s.id}?utm_source=generator"
    allow="encrypted-media" loading="lazy"></iframe>`;
  $('embed').style.display = 'block';
  playing = false; renderNowPlaying();
}
function renderNowPlaying() {
  const s = queue[qi];
  // The bar only earns its space once there is actually something to show.
  $('player').style.display = s ? 'block' : 'none';
  document.body.classList.toggle('has-player', !!s);
  if (!s) return;
  $('pTitle').textContent = s.s;
  $('pArtist').textContent = s.a;
  $('pChip').style.display = '';
  $('pChip').textContent = CATS[s.c].he;
  $('pChip').style.background = chipC(s.c);
  $('pToggle').innerHTML = playing
    ? '<span class="eq"><i></i><i></i><i></i></span>'
    : '<svg width="13" height="15" viewBox="0 0 14 16" fill="#fff"><path d="M0 0v16l14-8z"/></svg>';
  renderRows();
}
window.onSpPlaybackState = st => {
  playing = !st.paused;
  const t = st.track_window && st.track_window.current_track;
  if (t) {
    const idx = queue.findIndex(s => s.id === t.id);
    if (idx >= 0) qi = idx;
  }
  $('prog').style.width = st.duration ? (st.position / st.duration * 100) + '%' : '0%';
  renderNowPlaying();
};
window.spUpdateUI = () => {
  const connected = spConnected();
  $('goTitle').textContent = connected ? 'נגן את הכל, אקראית' : 'התחבר לספוטיפיי';
  if (!connected) $('goSub').textContent = 'כדי לנגן ולשמור פלייליסטים';
  else if (LIB.length) $('goSub').textContent =
    `${nf(LIB.filter(s => s.id).length)} שירים · ${typeof spPremium !== 'undefined' && spPremium ? 'ניגון מלא' : 'דרך ספוטיפיי'}`;
};

// ---------- csv ----------
function downloadCsv() {
  const { name, list } = selection();
  const head = ['Index', 'TagTime', 'Title', 'Artist', 'URL', 'TrackKey'];
  const body = list.map((s, i) => [i + 1, s.t || '', s.s, s.a, s.u || '', s.k || '']);
  const csv = '﻿' + [head, ...body]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `shazam_${name.replace(/[^\w֐-׿]+/g, '_')}.csv`;
  a.click();
}

// ---------- wiring ----------
$('drop').onclick = () => $('file').click();
$('file').onchange = e => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; };
['dragenter', 'dragover'].forEach(ev => $('drop').addEventListener(ev, e => {
  e.preventDefault(); $('drop').classList.add('over');
}));
['dragleave', 'drop'].forEach(ev => $('drop').addEventListener(ev, e => {
  e.preventDefault(); $('drop').classList.remove('over');
}));
$('drop').addEventListener('drop', e => { if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });

$('goPlay').onclick = () => { if (!spConnected()) spLogin(); else shuffleAll(); };
$('expBtn').onclick = () => {
  const open = $('panel').classList.toggle('open');
  $('expBtn').classList.toggle('open', open);
};
$('segCat').onclick = () => {
  panelMode = 'category'; $('segCat').classList.add('on'); $('segMood').classList.remove('on');
  $('panelCats').hidden = false; $('panelMoods').hidden = true; renderSummary();
};
$('segMood').onclick = () => {
  panelMode = 'mood'; $('segMood').classList.add('on'); $('segCat').classList.remove('on');
  $('panelMoods').hidden = false; $('panelCats').hidden = true; renderSummary();
};
$('actPlay').onclick = () => { const { list } = selection(); startPlay(list, 0); };
$('actCsv').onclick = downloadCsv;
$('actSave').onclick = () => {
  const { name, list } = selection();
  const ids = list.map(s => s.id).filter(Boolean);
  if (!ids.length) { alert('אין שירים עם התאמה בספוטיפיי בבחירה הזו.'); return; }
  spCreatePlaylist('שאזאם — ' + name, ids);
};
$('repExp').onclick = () => { repsOpen = !repsOpen; renderRepeats(); };
$('dictToggle').onclick = () => {
  const open = $('dict').hidden;
  $('dict').hidden = !open;
  $('dictToggle').classList.toggle('open', open);
};
$('reload').onclick = () => $('file').click();
$('q').oninput = e => { query = e.target.value; shown = 40; renderRows(); };
$('moreBtn').onclick = () => { shown += 40; renderRows(); };
$('pToggle').onclick = () => { if (queue.length) spTogglePlay(); };
$('pInfo').onclick = () => {
  const s = queue[qi]; if (!s) return;
  $('popDot').style.background = fill(s.c);
  $('popName').textContent = CATS[s.c].he;
  $('popBody').textContent = DICT[s.c];
  $('pop').classList.toggle('open');
};
$('popX').onclick = () => $('pop').classList.remove('open');
$('spSave').onclick = () => spSaveSetup();
$('spCancel').onclick = () => { $('spSetup').style.display = 'none'; };

// ---------- boot ----------
renderStrip();
try {
  const saved = JSON.parse(localStorage.getItem(LIB_KEY));
  if (saved && saved.length) { LIB = saved; showApp(); }
} catch (e) {}
spHandleRedirect().then(() => {
  const p = sessionStorage.getItem('mm_pending');
  if (p && spConnected()) {
    sessionStorage.removeItem('mm_pending');
    const { ids, off } = JSON.parse(p);
    queue = ids.map(id => LIB.find(s => s.id === id)).filter(Boolean);
    qi = off || 0;
    setTimeout(pushToSpotify, 1200);   // give the SDK a moment to hand us a device
  }
});
