/* Chargement live : Open-Meteo (marine + prévisions), heure de Paris. Appelé avant le rendu. */
const SHORT_MONTHS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const LIVE_URLS = () => {
  const q = 'latitude=47.26&longitude=-2.34&timezone=Europe%2FParis&forecast_days=8';
  return {
    marine: `https://marine-api.open-meteo.com/v1/marine?${q}&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,sea_level_height_msl,sea_surface_temperature&daily=swell_wave_height_max,swell_wave_period_max,swell_wave_direction_dominant`,
    fc: `https://api.open-meteo.com/v1/forecast?${q}&wind_speed_unit=kmh&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation,cloud_cover&daily=wind_speed_10m_max,wind_gusts_10m_max,precipitation_sum,temperature_2m_max`
  };
};
function parisNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
async function getJSON(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
function mergeLive(D, marine, fc, asof) {
  const mh = marine.hourly, fh = fc.hourly, md = marine.daily, fd = fc.daily;
  if (!mh || !fh || !md || !fd || !mh.time || mh.time.length < 24) throw new Error('format');
  for (const k of Object.keys(D.hourly)) if (k >= '2026-11-01') delete D.hourly[k];
  for (const k of Object.keys(D.daily)) if (k >= '2026-11-01') delete D.daily[k];
  const days = [...new Set(mh.time.map(t => t.slice(0, 10)))];
  const num = (a, i) => (a && a[i] != null ? a[i] : null);
  days.forEach((iso, k) => {
    const idx = mh.time.map((t, i) => t.startsWith(iso) ? i : -1).filter(i => i >= 0);
    const di = md.time.indexOf(iso);
    let dl = { sh: num(md.swell_wave_height_max, di), sp: num(md.swell_wave_period_max, di), wd: num(md.swell_wave_direction_dominant, di), wm: num(fd.wind_speed_10m_max, di), gm: num(fd.wind_gusts_10m_max, di), pr: num(fd.precipitation_sum, di), tx: num(fd.temperature_2m_max, di) };
    if (k <= 4 && idx.length === 24) {
      const pick = (src, key, fill = 0) => idx.map(i => { const v = src[key] ? src[key][i] : null; return v == null ? fill : v; });
      const h = { sh: pick(mh, 'swell_wave_height'), sp: pick(mh, 'swell_wave_period', 10), sd: pick(mh, 'swell_wave_direction', 258), t: pick(mh, 'sea_level_height_msl'), sst: pick(mh, 'sea_surface_temperature', 13), w: pick(fh, 'wind_speed_10m'), wd: pick(fh, 'wind_direction_10m'), g: pick(fh, 'wind_gusts_10m'), tmp: pick(fh, 'temperature_2m'), pr: pick(fh, 'precipitation'), cl: pick(fh, 'cloud_cover') };
      const okSwell = idx.every(i => mh.swell_wave_height && mh.swell_wave_height[i] != null);
      if (okSwell) {
        D.hourly[iso] = h;
        const im = h.sh.indexOf(Math.max(...h.sh));
        dl = { sh: Math.max(...h.sh), sp: h.sp[im], wd: h.sd[im], wm: Math.max(...h.w), gm: Math.max(...h.g), pr: Math.round(h.pr.reduce((a, b) => a + b, 0) * 10) / 10, tx: Math.max(...h.tmp) };
      }
    }
    if (dl.sh != null) D.daily[iso] = Object.fromEntries(Object.entries(dl).map(([a, b]) => [a, b == null ? 0 : b]));
  });
  const sst = (mh.sea_surface_temperature || []).filter(v => v != null);
  D.sstWeek = sst.length ? Math.round(sst.reduce((a, b) => a + b, 0) / sst.length * 10) / 10 : 13;
  D.asof = asof; D.firstDay = days[0];
}
async function liveLoad(D) {
  const KEY = 'surf-pornichet-cache';
  const u = LIVE_URLS();
  try {
    const [marine, fc] = await Promise.all([getJSON(u.marine), getJSON(u.fc)]);
    const asof = parisNow();
    mergeLive(D, marine, fc, asof);
    try { localStorage.setItem(KEY, JSON.stringify({ marine, fc, asof })); } catch (_) {}
    D.fetchedAt = Date.now();
    return true;
  } catch (err) {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (c && c.asof && Date.now() - new Date(c.asof + ':00').getTime() < 24 * 3600 * 1000) { mergeLive(D, c.marine, c.fc, c.asof); D.stale = true; D.fetchedAt = Date.now(); return true; }
    } catch (_) {}
    return false;
  }
}
