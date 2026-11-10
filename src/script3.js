const D = __DATA__;
document.documentElement.lang = 'fr';
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const NB = '\u00A0';
const SPOT = { lat: 47.26, lon: -2.34, swellIdeal: 258, offshore: 55 };
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const DAYS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const DAYS3 = ['dim','lun','mar','mer','jeu','ven','sam'];
const LABEL = { go: 'Go', correct: 'Correct', plat: 'Oublie\u00A0!', costaud: 'Oublie\u00A0!' };
const SUB = { plat: 'Trop plat', costaud: 'Trop costaud' };
const SHORT = { go: 'Go', correct: 'Correct', plat: 'Trop plat', costaud: 'Trop costaud' };
const CELL = { go: 'Go', correct: 'Correct', plat: 'Oublie', costaud: 'Oublie' };
const _unusedStar = '<svg class="star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.4L12 17.8 5.4 21.9l1.8-7.4L1.5 9.6 9 9z"/></svg>';
const RANK = { go: 3, correct: 2, plat: 1, costaud: 0 };
const fr = (n, d = 1) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const angdiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const el = id => document.getElementById(id);
const ASOF_DATE = D.asof.slice(0, 10);
const ASOF_H = +D.asof.slice(11, 13) + +D.asof.slice(14, 16) / 60;
const addDays = (iso, k) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10); };
const longDate = d => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const fx = s => String(s).replace(/ ([:;?!])/g, '\u00A0$1').replace(/ (km\/h|m|s)\b/g, '\u00A0$1');

/* Règles de verdict : voir doc 06. La règle « tempête » est une proposition de sécurité. */
function classify(h, p, dir, wind, gust) {
  if (wind > 35 || (gust || 0) > 60) return { c: 'costaud', r: ['storm'] };
  if (h < 0.3) return { c: 'plat', r: ['flat'] };
  if (h > 1.5) return { c: 'costaud', r: ['big'] };
  let c = (h >= 0.5 && h <= 1.0) ? 'go' : 'correct';
  const r = [];
  if (h < 0.5) r.push('small');
  if (h > 1.0) r.push('large');
  if (wind > 25) { c = 'correct'; r.push('wind'); }
  if (p < 8) { c = 'correct'; r.push('period'); }
  if (angdiff(dir, SPOT.swellIdeal) > 30) { c = 'correct'; r.push('dir'); }
  return { c, r };
}
const PRIORITY = ['storm', 'big', 'flat', 'large', 'wind', 'period', 'dir', 'small'];
const REASON = {
  storm: 'Tempête : vent très fort, on reste au sec.',
  flat: 'Presque pas de vagues : le déplacement ne vaut pas le coup.',
  big: 'Vagues trop grosses pour ton niveau : on reste sur le sable.',
  large: 'Vagues costaudes pour ton niveau : prudence, reste près du bord.',
  wind: 'Vent fort : la surface sera hachée.',
  period: 'Vagues trop rapprochées : la mer sera désordonnée.',
  dir: 'Houle mal orientée pour la plage : peu de vagues arriveront.',
  small: 'Vagues toutes petites : tu en prendras quelques-unes, sans plus.'
};
function reasonText(c, r, wind) {
  if (c === 'go') return wind > 15 ? 'Vagues propres et bien orientées, vent modéré : de bonnes conditions pour ton niveau.' : 'Vagues propres et bien orientées, vent faible : de bonnes conditions pour ton niveau.';
  const k = PRIORITY.find(x => r.includes(x));
  return REASON[k] || '';
}

/* Heure de Paris : +2 h entre le dernier dimanche de mars et celui d'octobre, sinon +1 h */
function parisOffset(date) {
  const y = date.getUTCFullYear();
  const lastSun = m => { const d = new Date(Date.UTC(y, m + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime() + 3600000; };
  return (date.getTime() >= lastSun(2) && date.getTime() < lastSun(9)) ? 2 : 1;
}
/* Soleil : formule NOAA simplifiée */
function sunTimes(date) {
  const rad = Math.PI / 180;
  const N = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000);
  const g = 2 * Math.PI / 365 * (N - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(SPOT.lat * rad) * Math.cos(dec)) - Math.tan(SPOT.lat * rad) * Math.tan(dec)) / rad;
  const tz = parisOffset(date);
  return { rise: (720 - 4 * (SPOT.lon + ha) - eq) / 60 + tz, set: (720 - 4 * (SPOT.lon - ha) - eq) / 60 + tz };
}
const hhmm = x => { const h = Math.floor(x), m = Math.round((x - h) * 60); return `${h}h${String(m).padStart(2, '0')}`; };

let state = { mode: 'week', session: 2, sel: ASOF_DATE, water: 15 };
/* Règle produit : quand le dernier créneau possible d'aujourd'hui est passé, le jour J disparaît de la semaine (on repart de demain). */
let START = ASOF_DATE;

function buildDay(iso) {
  const date = new Date(iso + 'T12:00:00Z'), hr = (state.mode !== 'week' || iso <= addDays(START, 3)) ? D.hourly[iso] : undefined, dl = D.daily[iso];
  const o = { iso, date, weekend: [0, 6].includes(date.getUTCDay()), sun: sunTimes(date), dl };
  if (hr) {
    const min = Math.min(...hr.t), max = Math.max(...hr.t);
    const first = Math.max(7, Math.ceil(o.sun.rise - 0.25));
    const slots = [];
    for (let h = first; h <= 19 && h + 1 <= o.sun.set; h++) {
      if (iso === ASOF_DATE && state.mode === 'week' && h < ASOF_H) continue;
      const cl = classify(hr.sh[h], hr.sp[h], hr.sd[h], hr.w[h], hr.g[h]);
      const lvl = (hr.t[h] - min) / (max - min);
      const slope = h < 23 ? hr.t[h + 1] - hr.t[h] : 0;
      const bonus = (lvl < 0.66 && slope > 0) ? 1.5 : (lvl < 0.35 ? 1 : 0);
      const score = RANK[cl.c] * 100 - Math.abs(hr.sh[h] - 0.8) * 10 - hr.w[h] * 0.15 + bonus;
      slots.push({ h, c: cl.c, r: cl.r, score, lvl, slope });
    }
    if (slots.length) {
      o.slots = slots; o.hr = hr;
      o.best = slots.reduce((a, b) => b.score > a.score ? b : a);
      o.c = o.best.c; o.r = o.best.r;
      return o;
    }
    o.over = true;
  }
  const cl = classify(dl.sh, dl.sp, dl.wd, dl.wm, dl.gm);
  o.c = cl.c; o.r = cl.r;
  return o;
}

const ICON = {
  'Vagues': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 21c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/></svg>',
  'Vent': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/></svg>',
  'Marée': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v14"/><path d="M3 14l4 4 4-4"/><path d="M17 20V6"/><path d="M13 10l4-4 4 4"/></svg>',
  'Météo': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 19z"/></svg>',
  'Eau et tenue': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v8"/></svg>'
};
function sizeWord(h) { return h < 0.3 ? 'presque plates' : h < 0.5 ? 'toutes petites' : h <= 1.0 ? 'petites, faciles' : h <= 1.5 ? 'costaudes pour un débutant' : 'grosses'; }
function periodWord(p) { return p >= 9 ? 'bien formées, bien espacées' : p >= 8 ? 'correctement espacées' : 'rapprochées, désordonnées'; }
function windWord(v) { return v < 5 ? 'quasi nul' : v <= 15 ? 'faible' : v <= 25 ? 'modéré' : v <= 35 ? 'fort' : 'très fort'; }
function windDirWord(deg, v) { if (v < 5) return ''; const d = angdiff(deg, SPOT.offshore); return d <= 45 ? 'vient de la terre : surface lisse' : d <= 110 ? 'vient de côté' : 'vient de la mer : surface hachée'; }
function tideWord(s) { const lv = s.lvl < 0.33 ? 'basse' : s.lvl < 0.66 ? 'mi-marée' : 'haute'; return `${lv}, ${s.slope >= 0 ? 'montante' : 'descendante'}`; }
const skyWord = c => c < 25 ? 'Ciel dégagé' : c < 60 ? 'Éclaircies' : c < 90 ? 'Ciel nuageux' : 'Couvert';
const rainWord = mm => mm < 0.2 ? 'sec' : mm < 1 ? 'quelques gouttes' : mm < 5 ? 'pluie faible' : 'pluie';

const SUITS = ['2 mm', '3/2', '4/3', '5/4', '6/5'];
function gear(water, windy) {
  let lo, hi, acc = [];
  if (water >= 20) { lo = 0; hi = 1; }
  else if (water >= 17) { lo = 1; hi = 1; }
  else if (water >= 14) { lo = 2; hi = 2; if (water >= 15) acc.push('chaussons'); }
  else if (water >= 11) { lo = 2; hi = 3; acc.push('chaussons'); if (water <= 12) acc.push('cagoule'); }
  else { lo = 3; hi = 4; acc.push('chaussons', 'gants', 'cagoule'); }
  if (windy) { lo = Math.min(4, lo + 1); hi = Math.min(4, hi + 1); }
  const mine = 2;
  const rec = lo === hi ? SUITS[lo] : `${SUITS[lo]} à ${SUITS[hi]}`;
  const cmp = mine >= lo && mine <= hi ? 'adaptée' : mine < lo ? 'un peu juste' : 'plus épaisse que nécessaire';
  return { rec, acc, cmp };
}

function weekStart() { return state.mode === 'week' ? START : D.sessions[state.session].date; }
function relLabel(iso) { return state.mode !== 'week' ? '' : iso === ASOF_DATE ? "Aujourd'hui · " : iso === addDays(ASOF_DATE, 1) ? 'Demain · ' : ''; }

function render(ropt = {}) {
  const ae = document.activeElement;
  const focusWeek = el('week').contains(ae), focusWater = ae && ae.id === 'water';
  const o = buildDay(state.sel);
  const hero = el('hero');
  hero.dataset.v = o.c;
  const rel = relLabel(state.sel).replace(' · ', '');
  const dEl = el('date');
  if (state.mode === 'week') { dEl.textContent = rel; dEl.hidden = !rel; } else { dEl.textContent = cap(longDate(o.date)); dEl.hidden = false; }
  el('srdate').textContent = `Verdict pour ${longDate(o.date)} : `;
  el('badge').textContent = state.mode === 'week' ? `Prévisions Open-Meteo · ${D.asof.slice(8, 10).replace(/^0/, '')} nov. ${D.asof.slice(11, 13)}h${D.asof.slice(14, 16)}` : 'Rejeu · données réelles';
  el('verdict').textContent = LABEL[o.c];
  const sub = el('vsub'); sub.hidden = !SUB[o.c]; sub.textContent = SUB[o.c] || '';

  const slotEl = el('slot');
  let wind = 0, refH = null, whenTxt = 'maximum du jour', sceneSize, scenePeriod;
  slotEl.hidden = false;
  const todayLeft = state.mode === 'week' && state.sel === ASOF_DATE;
  if (o.best) {
    const s = o.best.h, e = Math.min(s + 2, Math.floor(o.sun.set), 20);
    slotEl.innerHTML = `<span>${todayLeft ? 'Meilleur créneau restant' : 'Meilleur créneau'}</span><b class="num">${s}h${NB}–${NB}${e}h</b>`;
    wind = o.hr.w[s]; refH = s; whenTxt = `${s}h – ${e}h`; sceneSize = o.hr.sh[s]; scenePeriod = o.hr.sp[s];
  } else {
    slotEl.innerHTML = o.over ? '<span>Journée terminée.</span><button class="chip" id="nextBtn" type="button">Voir demain →</button>' : '';
    slotEl.hidden = !o.over;
    wind = o.dl.wm; sceneSize = o.dl.sh; scenePeriod = o.dl.sp;
  }
  if (o.best && (o.c === 'costaud' || o.c === 'plat')) slotEl.hidden = true;
  el('reason').textContent = fx(reasonText(o.c, o.r, wind));
  const nb = el('nextBtn'); if (nb) nb.onclick = () => { state.sel = addDays(ASOF_DATE, 1); render(); };
  el('live').textContent = `${longDate(o.date)} : ${SHORT[o.c]}${o.best ? `, créneau ${o.best.h}h à ${Math.min(o.best.h + 2, Math.floor(o.sun.set), 20)}h` : ''}. ${el('reason').textContent}`;
  if (!REDUCED && ropt.animate !== false) ['swap1', 'slot', 'reason'].forEach((id, i) => el(id).animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 40, easing: 'ease-out', fill: 'backwards' }));
  el('when').textContent = whenTxt;
  drawScene(o.c, sceneSize, scenePeriod);

  /* retour + rejeux */
  el('backBtn').hidden = state.mode !== 'sess';
  el('backBtn').onclick = () => { state.mode = 'week'; pickDefault(); render(); el('h1').focus({ preventScroll: true }); };
  const rp = el('rchips'); rp.innerHTML = '';
  D.sessions.forEach((s, i) => {
    const d = new Date(s.date + 'T12:00:00Z');
    const b = document.createElement('button');
    b.className = 'chip light'; b.type = 'button';
    b.setAttribute('aria-pressed', String(state.mode === 'sess' && state.session === i));
    b.textContent = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} · ${s.feel.replace(/[«»]/g, '').trim()}`;
    b.onclick = () => { state.mode = 'sess'; state.session = i; state.sel = s.date; render(); window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); el('h1').focus({ preventScroll: true }); };
    rp.appendChild(b);
  });

  /* encart session */
  const sb = el('sessionBox');
  const sessOfDay = state.mode === 'sess' ? D.sessions.find(s => s.date === state.sel) : null;
  if (sessOfDay && o.slots) {
    const sl = o.slots.find(x => x.h === sessOfDay.hour), hr = o.hr, h = sessOfDay.hour;
    sb.hidden = false;
    sb.innerHTML = `<div class="card session">
      <div class="k">Ta session · ${sessOfDay.start} · ${sessOfDay.min} min dans l'eau</div>
      <div class="cmp"><span class="pill" data-v="${sl.c}"><i class="dot"></i>Modèle à ${h}h : ${SHORT[sl.c]}</span><span>Ton ressenti : ${sessOfDay.feel}</span></div>
      <div style="color:var(--muted);font-size:13px">Vagues ${fr(hr.sh[h], 2)} m, ${fr(hr.sp[h])} s, vent ${fr(hr.w[h], 0)} km/h. Test de cohérence, pas une validation : les seuils ont été posés après avoir vu ces données.</div>
    </div>`;
  } else { sb.hidden = true; sb.innerHTML = ''; }

  /* niveau 2 */
  const L = [];
  const isNov = state.sel >= '2026-11-01';
  if (o.best) {
    const hr = o.hr, h = refH, s = o.best;
    L.push(['Vagues', `${fr(hr.sh[h], 2)} m · ${sizeWord(hr.sh[h])}`, `${periodWord(hr.sp[h])}${angdiff(hr.sd[h], SPOT.swellIdeal) > 30 ? ' · mal orientées' : ''}`]);
    L.push(['Vent', `${fr(hr.w[h], 0)} km/h · ${windWord(hr.w[h])}`, `${windDirWord(hr.wd[h], hr.w[h])}${hr.g[h] ? ` · rafales ${fr(hr.g[h], 0)} km/h` : ''}`.replace(/^ · /, '')]);
    L.push(['Marée', tideWord(s).replace(', ', ' · '), 'Petit bonus seulement, elle ne change pas le verdict.']);
  } else {
    const dl = o.dl;
    L.push(['Vagues', `jusqu'à ${fr(dl.sh, 2)} m · ${sizeWord(dl.sh)}`, 'Maximum de la journée, estimation grossière.']);
    L.push(['Vent', `jusqu'à ${fr(dl.wm, 0)} km/h · ${windWord(dl.wm)}`, dl.gm ? `Rafales jusqu'à ${fr(dl.gm, 0)} km/h.` : '']);
    L.push(['Marée', '—', 'Disponible avec les données horaires.']);
  }
  if (sessOfDay) L.push(['Météo', `${sessOfDay.cond} · ${sessOfDay.temp}°`, 'Relevé Strava pendant ta session.']);
  else if (o.best && o.hr.cl) { const h = refH; L.push(['Météo', `${skyWord(o.hr.cl[h])} · ${fr(o.hr.tmp[h], 0)}° · ${rainWord(o.hr.pr[h] + (o.hr.pr[h + 1] || 0))}`, 'Prévision Open-Meteo, à l\'heure du créneau.']); }
  else if (o.dl && o.dl.pr !== undefined) L.push(['Météo', `${rainWord(o.dl.pr)}${o.dl.pr >= 0.2 ? ` (${fr(o.dl.pr, 1)} mm)` : ''} · max ${fr(o.dl.tx, 0)}°`, 'Synthèse du jour, ciel heure par heure plus tard.']);
  else L.push(['Météo', 'à brancher', 'Ciel, pluie et température de l\'air pour ce jour.']);

  let water, waterNote;
  if (isNov) { water = Math.round(o.best && o.hr.sst ? o.hr.sst[refH] : D.sstWeek); waterNote = 'Température de l\'eau prévue par Open-Meteo.'; }
  else { water = state.water; waterNote = 'Température de l\'eau : valeur d\'exemple.'; }
  const g = gear(water, wind > 25);
  const accTxt = g.acc.length ? ` + ${g.acc.join(', ')}` : '';
  const opts = [11, 13, 15, 17, 19, 21].map(w => `<option value="${w}"${w === state.water ? ' selected' : ''}>${w}°</option>`).join('');
  const waterCtl = isNov ? `${water}°` : `<select id="water" aria-label="Température de l'eau (exemple)">${opts}</select>`;
  L.push(['Eau et tenue', `${waterCtl} · ${g.rec}${accTxt}`, `Ta 4/3 : ${g.cmp}${wind > 25 ? ' · +1 cran pour le vent fort' : ''}. ${waterNote}`]);
  el('lines').innerHTML = L.map(([l, v, s]) => {
    const parts = String(v).split(' · '); const big = parts[0], word = parts.slice(1).join(' · ');
    const m = /^(jusqu'à )?(\d[\d,]*)\s?(m|km\/h|°)?$/.exec(big);
    const bigHtml = m ? `${m[1] ? '<span class="pre">jusqu\'à</span>' : ''}${m[2]}${m[3] === '°' ? '°' : m[3] ? `<span class="u">${m[3]}</span>` : ''}` : fx(big);
    return `<div class="tile${l === 'Eau et tenue' ? ' wide' : ''}"><div class="l">${ICON[l] || ''}${l}</div><div class="big${m ? ' n' : ''}">${bigHtml}</div>${word ? `<div class="word">${fx(word)}</div>` : ''}${s ? `<small>${fx(s)}</small>` : ''}</div>`;
  }).join('');
  const ws = el('water'); if (ws) ws.onchange = e => { state.water = +e.target.value; render(); };

  /* semaine */
  const start = weekStart();
  const days = []; for (let k = 0; k < 7; k++) { const di = addDays(start, k); if (D.daily[di] || D.hourly[di]) days.push(buildDay(di)); }
  const wk = el('week'); const prevScroll = wk.scrollLeft; wk.innerHTML = '';
  days.forEach((dobj, k) => {
    const iso = dobj.iso;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day' + (dobj.weekend ? ' we' : '') + (k >= 4 ? ' trend' : '');
    b.setAttribute('aria-pressed', String(iso === state.sel));
    b.dataset.v = dobj.c;
    const hv = dobj.best && dobj.hr ? dobj.hr.sh[dobj.best.h] : dobj.dl ? dobj.dl.sh : null;
    const hgt = hv == null ? '' : `${fr(hv, 1)}${NB}m`;
    b.setAttribute('aria-label', `${longDate(dobj.date)} : ${SHORT[dobj.c]}${hgt ? `, vagues ${hgt}` : ''}${k >= 4 ? ' (tendance)' : ''}`);
    b.innerHTML = `<span class="wd">${DAYS3[dobj.date.getUTCDay()]}</span><span class="dn num">${dobj.date.getUTCDate()}</span><span class="ico">${ICON['Vagues']}</span><span class="hgt num">${hgt || '–'}</span><span class="vl">${CELL[dobj.c]}</span>`;
    b.onclick = () => { state.sel = iso; render(); };
    wk.appendChild(b);
  });
  wk.scrollLeft = prevScroll;
  const selB = wk.querySelector('[aria-pressed="true"]');
  if (selB && (selB.offsetLeft < wk.scrollLeft || selB.offsetLeft + selB.offsetWidth > wk.scrollLeft + wk.clientWidth)) wk.scrollTo({ left: selB.offsetLeft - (wk.clientWidth - selB.offsetWidth) / 2, behavior: REDUCED ? 'auto' : 'smooth' });
  if (focusWeek) { const p = wk.querySelector('[aria-pressed="true"]'); if (p) p.focus({ preventScroll: true }); }
  if (focusWater) { const w = el('water'); if (w) w.focus({ preventScroll: true }); }

  drawHours(o, sessOfDay, todayLeft);
}

function waveY(x, base, amp, len, ph) { return base + amp * Math.sin(2 * Math.PI * x / len + ph) + amp * 0.35 * Math.sin(4 * Math.PI * x / len + ph * 1.7); }
function wavePath(base, amp, len, ph) { let d = `M0 ${base}`; for (let x = 0; x <= 400; x += 8) d += ` L${x} ${waveY(x, base, amp, len, ph).toFixed(1)}`; return d + ' L400 280 L0 280Z'; }
/* La houle dessinée suit la prévision : amplitude selon la hauteur, écartement selon la période */
function drawScene(c, size, period) {
  const H = 150, bases = [H, H + 32, H + 66, H + 108];
  let s = '';
  if (c === 'costaud') {
    s += '<ellipse cx="90" cy="78" rx="70" ry="16" fill="#0B1218" opacity=".3"/><ellipse cx="170" cy="92" rx="90" ry="14" fill="#0B1218" opacity=".28"/><ellipse cx="320" cy="66" rx="80" ry="18" fill="#0B1218" opacity=".34"/>';
  } else {
    const low = c === 'correct';
    s += `<circle cx="346" cy="${low ? H + 2 : H - 12}" r="${low ? 26 : 20}" style="fill:var(--sun)" opacity="${c === 'plat' ? .55 : .92}"/>`;
  }
  const P = [];
  bases.forEach((b, i) => {
    const amp = Math.min(34, (2 + size * 9) * (1 + i * 0.45)), len = (70 + period * 10) * (1 + i * 0.35), ph = i * 1.3 + 0.5;
    P.push({ b, amp, len, ph });
    const bob = `class="bob" style="--a:${(1.5 + i * 1.2).toFixed(1)};--d:${(5 + i * 1.7).toFixed(1)}s;animation-delay:${(-i * 1.3).toFixed(1)}s"`;
    let g = `<path d="${wavePath(b, amp, len, ph)}" style="fill:var(--sea${Math.min(i, 2) + 1})" opacity="${i === 0 ? .9 : 1}"/>`;
    if (i === 2 && (c === 'go' || c === 'correct')) {
      const x = 236, y = waveY(x, b, amp, len, ph) - 3;
      g += `<g transform="translate(${x} ${y.toFixed(1)}) rotate(-9)" fill="#0A2A30" opacity=".92"><ellipse cx="0" cy="0" rx="18" ry="2.6"/><path d="M-5 -2 L-3 -13 L3 -13 L6 -2z"/><circle cx="0" cy="-17.5" r="3.2"/><path d="M-3 -12 L-11 -8 M3 -12 L10 -15" stroke="#0A2A30" stroke-width="2" stroke-linecap="round" fill="none"/></g>`;
    }
    s += `<g ${bob}>${g}</g>`;
  });
  el('scene').innerHTML = s;
}

/* Courbe horaire : bande qui défile horizontalement (la dernière heure dépasse du bord = geste suggéré, comme l'appli météo iOS).
   Hauteur de houle par heure, point coloré par verdict, vent dessous ; toucher une heure affiche son détail. Aucun texte d'explication. */
const hs = { iso: null, h: null };
const VW = 360, CH = 118, CTOP = 14, CBOT = 8;
function drawHours(o, sessOfDay, todayLeft, keepScroll) {
  const box = el('hoursBody');
  if (!o.slots) {
    box.innerHTML = '<p class="hnote">Pas de données horaires pour ce jour : le verdict vient du maximum de la journée. Les heures arrivent à J+3.</p>';
    return;
  }
  const n = o.slots.length, hr = o.hr;
  const prev = box.querySelector('.hscroll'), prevLeft = prev ? prev.scrollLeft : 0;
  const dayChanged = hs.iso !== state.sel;
  if (dayChanged || !o.slots.some(s => s.h === hs.h)) { hs.iso = state.sel; hs.h = (o.best || o.slots[0]).h; }
  const COL = VW / n, W = VW, ch = CH - CTOP - CBOT;
  const vals = o.slots.map(s => hr.sh[s.h]);
  const ymax = Math.max(1.8, Math.max(...vals) * 1.08);
  const X = i => (i + 0.5) * COL, Y = v => CTOP + ch * (1 - v / ymax);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  if (n === 1) d = `M${pts[0][0] - 20} ${pts[0][1]} L${pts[0][0] + 20} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const selI = o.slots.findIndex(s => s.h === hs.h);
  const area = n > 1 ? `${d} L${pts[n - 1][0]} ${CH - CBOT} L${pts[0][0]} ${CH - CBOT}Z` : '';
  const svg = `<svg class="curve" viewBox="0 0 ${W} ${CH}" role="img" aria-label="Hauteur des vagues heure par heure, de ${fr(Math.min(...vals), 2)} à ${fr(Math.max(...vals), 2)} mètres">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <rect class="band" x="0" y="${Y(1.0).toFixed(1)}" width="${W}" height="${(Y(0.5) - Y(1.0)).toFixed(1)}" rx="4"/>
    ${ymax > 1.5 ? `<line class="big" x1="0" x2="${W}" y1="${Y(1.5).toFixed(1)}" y2="${Y(1.5).toFixed(1)}"/>` : ''}
    ${area ? `<path d="${area}" fill="url(#ag)"/>` : ''}
    <path class="line" d="${d}"/>
    <line class="guide" x1="${X(selI).toFixed(1)}" x2="${X(selI).toFixed(1)}" y1="${CTOP - 6}" y2="${CH - CBOT}"/>
    ${o.slots.map((s, i) => `<circle class="pt" cx="${X(i).toFixed(1)}" cy="${Y(vals[i]).toFixed(1)}" r="${i === selI ? 6.5 : 4.5}" style="fill:var(--${s.c})"/>${s === o.best ? `<circle class="ring" cx="${X(i).toFixed(1)}" cy="${Y(vals[i]).toFixed(1)}" r="10"/>` : ''}${sessOfDay && sessOfDay.hour === s.h ? `<circle class="mine" cx="${X(i).toFixed(1)}" cy="${Y(vals[i]).toFixed(1)}" r="13"/>` : ''}`).join('')}
  </svg>`;
  const arrow = deg => `<svg viewBox="0 0 12 12" style="transform:rotate(${Math.round(deg)}deg)" aria-hidden="true"><path d="M6 1v9M2.5 6.5L6 10l3.5-3.5"/></svg>`;
  const cols = o.slots.map(s => `<button type="button" data-h="${s.h}" aria-pressed="${s.h === hs.h}" aria-label="${s.h} heures : ${SHORT[s.c]}, vagues ${fr(hr.sh[s.h], 2)} mètre, vent ${fr(hr.w[s.h], 0)} kilomètres par heure${s === o.best ? ', meilleur créneau' : ''}"><span class="num">${s.h}h</span><span class="w num">${arrow(hr.wd[s.h])}${fr(hr.w[s.h], 0)}</span></button>`).join('');
  const s = o.slots[selI], h = s.h, tide = tideWord(s);
  const readout = `<div class="r1"><span class="num">${h}h</span><span class="pill" data-v="${s.c}"><i class="dot"></i>${SHORT[s.c]}</span>${s === o.best ? '<span class="tag">meilleur</span>' : ''}${sessOfDay && sessOfDay.hour === h ? '<span class="tag">ta session</span>' : ''}</div><div class="r2 num">${fx(`${fr(hr.sh[h], 2)} m · ${fr(hr.sp[h])} s · vent ${fr(hr.w[h], 0)} km/h (rafales ${fr(hr.g[h], 0)}) · ${tide.startsWith('mi') ? '' : 'marée '}${tide.replace('mi-', 'mi\u2011')}`)}</div>`;
  box.innerHTML = `<div class="readout" aria-live="polite">${readout}</div><div class="hscroll" role="group" aria-label="Heures de la journée"><div class="hin">${svg}<div class="hcols">${cols}</div></div></div>`;
  if (!box._bound) { box._bound = true; bindScrub(box); }
  hs.o = o; hs.sess = sessOfDay; hs.left = todayLeft;
  box.querySelectorAll('.hcols button').forEach(b => b.onclick = () => { hs.h = +b.dataset.h; drawHours(o, sessOfDay, todayLeft, true); const nb = box.querySelector(`.hcols button[data-h="${hs.h}"]`); if (nb) nb.focus({ preventScroll: true }); });
  box.querySelectorAll('.hcols button').forEach(b => b.onkeydown = e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const k = selI + (e.key === 'ArrowRight' ? 1 : -1); if (k < 0 || k >= n) return;
    e.preventDefault(); hs.h = o.slots[k].h; drawHours(o, sessOfDay, todayLeft, true);
    const nb = box.querySelector(`.hcols button[data-h="${hs.h}"]`); if (nb) { nb.focus({ preventScroll: true }); nb.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
  });
}

/* Glisser le doigt sur la courbe change d'heure ; le scroll vertical reste libre (touch-action: pan-y) */
function bindScrub(box) {
  let drag = false;
  const set = e => {
    const w = box.querySelector('.hin'); if (!w || !hs.o) return;
    const r = w.getBoundingClientRect(), n = hs.o.slots.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n)));
    const h = hs.o.slots[i].h;
    if (h !== hs.h) { hs.h = h; drawHours(hs.o, hs.sess, hs.left, true); }
  };
  box.addEventListener('pointerdown', e => { if (!e.target.closest('.hin')) return; drag = true; try { box.setPointerCapture(e.pointerId); } catch (_) {} set(e); });
  box.addEventListener('pointermove', e => { if (drag) set(e); });
  const end = () => { drag = false; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}

function pickDefault() {
  START = ASOF_DATE;
  if (buildDay(ASOF_DATE).over) START = addDays(ASOF_DATE, 1);
  state.sel = START;
}
pickDefault();
render();
