import json
# Version publique : aucune donnée personnelle embarquée (le rejeu des sessions est désactivé).
data = dict(asof="2000-01-01T00:00", sstWeek=13, hourly={}, daily={}, sessions=[])
tpl = open('app_live.html').read()
open('surf-live.html','w').write(tpl.replace('__DATA__', json.dumps(data, separators=(',',':'))))
print("ok")
