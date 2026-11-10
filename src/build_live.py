import json,re
j=open('script3.js').read(); h=open('head3.html').read(); ld=open('live_loader.js').read()
def R(s,a,b):
    assert s.count(a)==1,a[:70]; return s.replace(a,b)
first,rest=j.split('\n',1); assert first.startswith('const D = __DATA__')
rest=R(rest,"const isNov = state.sel >= '2026-11-01';","const isNov = state.mode === 'week';")
rest=R(rest,"el('badge').textContent = state.mode === 'week' ? `Prévisions Open-Meteo · ${D.asof.slice(8, 10).replace(/^0/, '')} nov. ${D.asof.slice(11, 13)}h${D.asof.slice(14, 16)}`",
 "el('badge').textContent = state.mode === 'week' ? `${D.stale ? 'Hors ligne' : 'Open-Meteo'} · ${D.asof.slice(8, 10).replace(/^0/, '')} ${SHORT_MONTHS[+D.asof.slice(5, 7) - 1]} ${D.asof.slice(11, 13)}h${D.asof.slice(14, 16)}`")
live = first + "\n" + ld + """
const __reason = document.getElementById('reason'); if (__reason) __reason.textContent = 'Chargement des prévisions…';
function __main() {
""" + rest + """
}
liveLoad(D).then(ok => {
  if (!ok) {
    document.getElementById('verdict').textContent = 'Pas de données';
    document.getElementById('reason').textContent = 'Impossible de joindre Open-Meteo pour le moment.';
    const s = document.getElementById('slot'); s.hidden = false; s.innerHTML = '<button class="chip" id="retry" type="button">Réessayer</button>';
    const mn = document.querySelector('main'); if (mn) mn.hidden = true;
    document.getElementById('retry').onclick = () => location.reload();
    return;
  }
  __main();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - D.fetchedAt > 30 * 60000) location.reload(); });
});
"""
h=R(h,'<span class="badge" id="badge">Prototype</span>','<span class="badge" id="badge">Open-Meteo</span>')
h='<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#071A2C">\n'+h
CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src https://marine-api.open-meteo.com https://api.open-meteo.com; base-uri 'none'; form-action 'none'"
h = h.replace('<title>', '<style>html,body{margin:0}</style>\n<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<meta name="referrer" content="no-referrer">\n<title>', 1)
open('app_live.html','w').write(h+'<script>\n'+live+'\n</script>\n</body>\n</html>\n' if '</html>' not in h else h)
