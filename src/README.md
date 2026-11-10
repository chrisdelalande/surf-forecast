# Sources de Surf Check Pornichet

`index.html` (à la racine du dépôt) est **généré** : ne le modifie pas à la main.

| Fichier | Rôle |
|---|---|
| `head3.html` | Structure de la page et tout le CSS |
| `script3.js` | Logique : verdict, créneaux, soleil, rendu, courbe horaire |
| `live_loader.js` | Appel Open-Meteo au chargement, cache hors ligne |
| `gen_live.py` | Injection des données initiales (vides : rien de personnel n'est publié) |
| `build_live.py`, `build.sh` | Assemblage |

Régénérer : `sh src/build.sh` (Python 3 requis).
