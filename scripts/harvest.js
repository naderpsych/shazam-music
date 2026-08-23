// Harvests Shazam song metadata with a real Chrome (Playwright).
// Shazam blocks plain HTTP clients by request fingerprint, so pages are fetched
// from inside a real browser page on the shazam.com origin.
//
//   node scripts/harvest.js [limit]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'shazam.json');
const IDS = path.join(__dirname, '..', 'tracks.json');
const LIMIT = parseInt(process.argv[2]) || 0;

(async () => {
  const ids = JSON.parse(fs.readFileSync(IDS, 'utf8'));
  let done = {};
  if (fs.existsSync(OUT)) { try { done = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {} }

  let todo = ids.filter(id => !(done[id] && done[id].g));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log(`ids=${ids.length} already=${Object.keys(done).length} todo=${todo.length}`);
  if (!todo.length) return;

  const browser = await chromium.launch({
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'Asia/Jerusalem',
  });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });
  const page = await ctx.newPage();

  // land on a real page once, so later fetches are same-origin with real cookies
  const seed = await page.goto('https://www.shazam.com/track/' + todo[0] + '/x',
    { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('seed status:', seed && seed.status());
  if (!seed || seed.status() >= 400) {
    console.log('BLOCKED at seed — Shazam refused the browser.');
    await browser.close();
    process.exit(2);
  }

  let ok = 0, fail = 0, delay = 900;
  for (let i = 0; i < todo.length; i++) {
    const id = todo[i];
    let rec = null;
    for (let k = 0; k < 4 && !rec; k++) {
      rec = await page.evaluate(async (tid) => {
        try {
          const r = await fetch('https://www.shazam.com/track/' + tid + '/x');
          const h = await r.text();
          if (h.length < 200000) return null;
          const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
          if (!m) return null;
          const ld = JSON.parse(m[1]);
          if (!ld.genre) return null;
          const arr = h.match(/"genre":\s*\[([^\]]{0,300})\]/);
          const pick = re => { const x = h.match(re); return x ? x[1].trim() : null; };
          return {
            ai: (r.url.match(/\/song\/(\d+)/) || [])[1] || null,
            g: ld.genre,
            gs: arr ? arr[1].split(',').map(s => s.replace(/[\s"\n\t]/g, '')).filter(x => x && x !== 'Music') : null,
            n: ld.name || null,
            a: ld.byArtist ? ld.byArtist.name : null,
            al: ld.inAlbum ? ld.inAlbum.name : null,
            d: ld.datePublished || null,
            lang: pick(/"language"\s*:\s*"([^"]{1,24})"/i),
            lbl: pick(/"recordLabel"\s*:\s*"([^"]{1,60})"/i),
          };
        } catch (e) { return null; }
      }, id);
      if (!rec) { delay = Math.min(delay * 1.5, 12000); await page.waitForTimeout(delay); }
    }
    if (rec) { done[id] = rec; ok++; if (delay > 700) delay -= 100; }
    else { fail++; }

    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      fs.writeFileSync(OUT, JSON.stringify(done));
      console.log(`${i + 1}/${todo.length}  ok=${ok} fail=${fail} delay=${Math.round(delay)}ms`);
    }
    await page.waitForTimeout(delay);
  }

  fs.writeFileSync(OUT, JSON.stringify(done));
  const total = Object.values(done).filter(x => x && x.g).length;
  console.log(`FINISHED  collected=${total}/${ids.length}  thisRun ok=${ok} fail=${fail}`);
  if (ok === 0) process.exit(3);
  await browser.close();
})();
