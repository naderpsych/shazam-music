// Classification rules — same logic used to build the baked-in list.
// ARTIST_MAP is loaded from artist_map.js (generated from data/artist_map.json).

// Tarab / classical-Arabic singers. Shazam often tags them only "egyptian pop",
// which is why the singer's name has to decide instead of the genre string.
const TARAB_ARTISTS = [
  'fairuz', 'fairouz', 'feyrouz', 'umm kulthum', 'um kalthoum', 'oum kalthoum', 'om kalsoum',
  'abdel halim', 'abdul halim', 'farid al atrash', 'farid el atrache', 'mohammed abdel wahab',
  'mohamed abdel wahab', 'wadih el safi', 'wadi el safi', 'sabah fakhri', 'sabah', 'toni hanna',
  'tony hanna', 'nasri shamseddine', 'zaki nassif', 'elias rahbani', 'majida el roumi',
  'warda', 'najat', 'asmahan', 'george wassouf', 'wael jassar', 'mayada el hennawy',
  'angham', 'sabah el sagheera', 'hoda', 'samira tewfik', 'salima murad', 'nazem al ghazali',
  'saleh abdel hay', 'karem mahmoud', 'shadia', 'najah salam', 'ilham al madfai', 'marcel khalife',
];

// Canonical category order — the index is what enrich.js stores and what the
// colour palette / legend order follow. Never reorder without rebuilding enrich.js.
const CAT_ORDER = [
  'ישראלי', 'Oriental & Arabic Classics', 'Modern Arabic Pop', 'Chanson & French',
  'Jazz, Blues & Soul', 'Golden Oldies (The Legends)', 'Rock & Alternative Anthems',
  'Indie, Folk & Bedroom', 'Techno & Electronic Club', 'Hip Hop, R&B & Groove', 'Modern Pop Hits',
];

const CAT_NAMES = {
  IL: 'ישראלי', ELEC: 'Techno & Electronic Club', ROCK: 'Rock & Alternative Anthems',
  INDIE: 'Indie, Folk & Bedroom', HIPHOP: 'Hip Hop, R&B & Groove', JAZZ: 'Jazz, Blues & Soul',
  ARCLASSIC: 'Oriental & Arabic Classics', ARMODERN: 'Modern Arabic Pop',
  FRENCH: 'Chanson & French', OLDIES: 'Golden Oldies (The Legends)', POP: 'Modern Pop Hits',
};

function classify(s) {
  const heb = /[֐-׿]/, arb = /[؀-ۿ]/;
  const g = ((s.Genres || '') + ' ' + (s['Parent Genres'] || '')).toLowerCase();
  const artist = (s.Artist || '');
  const artistLc = artist.toLowerCase().trim();
  const song = (s.Song || '');
  const isrc = (s.ISRC || '').toUpperCase();
  const year = parseInt((s['Album Date'] || '').substring(0, 4)) || 0;

  if (typeof ARTIST_MAP !== 'undefined' && ARTIST_MAP[artistLc]) return ARTIST_MAP[artistLc];

  if (isrc.startsWith('IL') || heb.test(artist) || heb.test(song) ||
      /israel|mizrahi|hebrew/.test(g)) return CAT_NAMES.IL;

  const isArabic = arb.test(artist) || arb.test(song) ||
    /arab|oriental|egypt|lebanon|khaleeji|maghreb|dabke|tarab|\brai\b|sha{1,2}bi/.test(g);
  if (isArabic) {
    // Tarab = the classical Arabic tradition (maqam, oud/ney/violin, long improvised vocals).
    // Album re-release years are unreliable, so the singer decides — not the date.
    if (typeof TARAB_ARTISTS !== 'undefined' && TARAB_ARTISTS.some(n => artistLc.includes(n))) return CAT_NAMES.ARCLASSIC;
    if (/tarab|classical arab|muwashshah|andalusian/.test(g)) return CAT_NAMES.ARCLASSIC;
    return CAT_NAMES.ARMODERN;
  }

  if (/chanson|french|franç|variete|variété/.test(g)) return CAT_NAMES.FRENCH;
  if (/jazz|blues|soul|swing|bossa|motown|gospel|doo-wop|lounge/.test(g)) return CAT_NAMES.JAZZ;
  if (/techno|house|trance|\bedm\b|electro|electronic|club|dubstep|drum and bass|synthwave|dance\b/.test(g)) return CAT_NAMES.ELEC;
  if (/hip hop|hip-hop|\brap\b|trap|r&b|rnb|urban|funk/.test(g)) return CAT_NAMES.HIPHOP;
  if (year && year < 1990) return CAT_NAMES.OLDIES;
  if (/metal|punk|hard rock|grunge|garage/.test(g)) return CAT_NAMES.ROCK;
  if (/indie|folk|acoustic|singer-songwriter|bedroom|dream pop|lo-fi|americana|country/.test(g)) return CAT_NAMES.INDIE;
  if (/rock|alternative|britpop/.test(g)) return CAT_NAMES.ROCK;
  return CAT_NAMES.POP;
}

// Stable lookup key for a track, so an uploaded CSV can be matched against the
// enrichment table (genres / Spotify id / audio features) built from the rich export.
function normPart(s) {
  return (s || '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s-\s.*$/, ' ')
    .replace(/[^0-9a-z֐-׿؀-ۿ]+/gi, ' ')
    .trim().replace(/\s+/g, ' ');
}
function normKey(title, artist) {
  return normPart(title) + '|' + normPart((artist || '').split(/,|&|feat/i)[0]);
}

// Tolerant CSV parser: survives unescaped quotes inside quoted fields
// (e.g. a label like בע"מ that broke naive parsers).
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"') {
        const n2 = text[i + 2];
        if (n === '"' && (n2 === ',' || n2 === '\n' || n2 === '\r' || n2 === undefined)) {
          f += '"'; q = false; i++; // malformed trailing "" before delimiter — literal quote, then close
        }
        else if (n === '"') { f += '"'; i++; }
        else if (n === ',' || n === '\n' || n === '\r' || n === undefined) { q = false; }
        else { f += '"'; } // unescaped inner quote — keep as literal text
      } else f += c;
    } else {
      if (c === '"' && f === '') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (f || row.length) { row.push(f); rows.push(row); row = []; f = ''; }
        if (c === '\r' && n === '\n') i++;
      } else f += c;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
