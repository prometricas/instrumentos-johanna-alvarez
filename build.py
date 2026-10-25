# Genera los dos archivos de instrumentos (navegador y funciones) a partir de fuente/instrumentos.json (versión vigente, PC)
# y fuente/instrumentos_v1.json (versión del 11 de octubre, usada por el grupo Piloto; PC_v1).
import json
d = json.load(open('fuente/instrumentos.json', encoding='utf-8'))
d['PC_v1'] = json.load(open('fuente/instrumentos_v1.json', encoding='utf-8'))['PC']
s = json.dumps(d, ensure_ascii=False)
open('public/assets/instrumentos.js', 'w', encoding='utf-8').write('window.INS = ' + s + ';\n')
open('netlify/lib/instrumentos.mjs', 'w', encoding='utf-8').write('export default ' + s + ';\n')
print('ok', list(d), 'v', d['PC']['version'], d['PC_v1']['version'])
