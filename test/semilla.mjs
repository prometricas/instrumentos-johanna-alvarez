// Datos ficticios para revisar la app en local. No toca el sitio publicado.
// Uso, con el servidor local encendido (node dev-local.mjs), en otra ventana de Git Bash:
//   node test/semilla.mjs              completa lo que falte sin reemplazar nada guardado
//   node test/semilla.mjs --reiniciar  borra todos los estudiantes (y la papelera) y vuelve a crear el plantel desde E01
//
// Crea el plantel de prueba de los tres grupos, aplicaciones de la prueba de pensamiento crítico (pretest y, en la mayoría,
// postest) con respuestas aleatorias pero coherentes con el nivel de cada estudiante (alto, medio o bajo; en Experimental
// el postest mejora un poco), y calificaciones en distintos estados: acordadas, de un solo calificador, de los dos sin
// acuerdo o sin calificar. Incluye omisiones, un ítem 8 sin elección previa y una aplicación interrumpida (datos faltantes).

//            código, nombre,     apellido,            grupo,          sexo,        edad, nivel,  aplicaciones y calificación (Pre:12F = pre con calificador 1, 2 y final), observaciones
const PLAN = [
  ['E01', 'Solomeo',   'Paredes',           'Piloto',       'Masculino', 8, 'medio', 'Pre:12F Post:12F'],
  ['E02', 'Alan',      'Brito Delgado',     'Piloto',       'Masculino', 8, 'alto',  'Pre:12F'],
  ['E03', 'Aquiles',   'Esquivel Madrazo',  'Piloto',       'Masculino', 8, 'alto',  'Pre:1'],
  ['E04', 'Joe',       'Hurtado Plata',     'Piloto',       'Masculino', 9, 'bajo',  'Pre:12F Post:12F', 'Medio hermano de Débora Plata (E05)'],
  ['E05', 'Débora',    'Plata',             'Piloto',       'Femenino',  7, 'bajo',  'Pre:', 'Media hermana de Joe Hurtado Plata (E04)'],
  ['E06', 'Elsa',      'Pato Roto',         'Experimental', 'Femenino',  8, 'medio', 'Pre:12F Post:12F'],
  ['E07', 'Armando',   'Casas de Bareque',  'Experimental', 'Masculino', 7, 'bajo',  'Pre:12F Post:12F'],
  ['E08', 'Ana',       'Tomía Forense',     'Experimental', 'Femenino',  9, 'alto',  'Pre:12F'],
  ['E09', 'Lola',      'Mento',             'Experimental', 'Femenino',  7, 'alto',  'Pre:12'],
  ['E10', 'Elena',     'Nito del Bosque',   'Control',      'Femenino',  7, 'medio', 'Pre:12F Post:12F'],
  ['E11', 'Dolores',   'Fuertes de Barriga','Control',      'Femenino',  8, 'bajo',  'Pre:12F Post:12F'],
  ['E12', 'Esperanza', 'Perdida',           'Control',      'Femenino',  8, 'bajo',  'Pre:12F'],
  ['E13', 'Esteban',   'Dido Prieto',       'Control',      'Masculino', 8, 'medio', 'Pre:2 Post:'],
];
// Casos especiales por código y momento: ítems omitidos (0 por regla), ítems sin oportunidad y aplicación interrumpida
const ESPECIAL = {
  'E04-Pretest': { omitidos: ['I04'] },
  'E07-Postest': { omitidos: ['I10', 'I18'] },
  'E05-Pretest': { terminada: 'S5' },         // se interrumpió antes de la situación 5: elecciones iniciales e ítems 17-20 faltantes
  'E11-Pretest': { omitidos: ['I05'] },        // sin elección en el 5, el ítem 8 queda como dato faltante
  'E13-Pretest': { omitidos: ['A05'] },        // sin elección inicial: el 17 y el 18 se responden igual
};
const CALIFICADORES = { 1: 'Johanna Álvarez', 2: 'Calificadora de apoyo' };
const NIVEL = { alto: 0.85, medio: 0.6, bajo: 0.35 }; // probabilidad de acierto en los cerrados y de calidad alta en los abiertos

// Banco de respuestas abiertas por parte y nivel de calidad (2, 1, 0), con el estilo de un niño de tercero
const TEXTOS = {
  I02b: { 2: ['si hay poco espacio los visitantes no pueden caminar bien', 'en el corredor hay más espacio pero pasan otros grupos y pueden tumbar los trabajos'], 1: ['es importante para la exposición', 'ayuda a saber dónde ponerla'], 0: ['los colores son bonitos', 'sí'] },
  I03b: { 2: { corredor: ['en el corredor hay más espacio para que los visitantes caminen'], salon: ['en el salón caben todos los trabajos y nadie los daña'] }, 1: ['es mejor', 'me gusta más ese lugar'], 0: ['porque sí', 'no sé'] },
  I04: { 2: ['¿Cuántos visitantes van a venir?', '¿A qué hora pasan los otros grupos por el corredor?', '¿Cuánto espacio necesitamos para todos los trabajos?'], 1: ['¿Podemos hacer la exposición?', '¿Qué día es la exposición?'], 0: ['¿De qué color son las cartulinas?', 'no sé'] },
  I05b: { 2: { luciana: ['si organizan primero cada uno sabe qué hacer y no pierden tiempo'], samuel: ['si empiezan ya aprovechan los 25 minutos'] }, 1: ['para trabajar mejor', 'así es más rápido'], 0: ['Luciana es niña', 'porque sí'] },
  I06d: { 2: { luciana: ['quiere mirar los materiales y repartir las tareas para trabajar con orden'], samuel: ['quiere empezar rápido para que les alcance el tiempo'] }, 1: ['quiere hacer bien la cartelera'], 0: ['le gusta', 'no sé'] },
  I10: { 2: ['los cuadernos se mojaron porque llovió y la ventana estaba abierta y estaban al lado de la ventana', 'entró la lluvia por la ventana abierta y mojó los cuadernos de la mesa, los del estante no porque estaban lejos'], 1: ['se mojaron por la lluvia', 'llovió y se mojaron'], 0: ['alguien les echó agua', 'los estudiantes los mojaron en el recreo'] },
  I13d: { 2: { mariana: ['cerca de la ventana entra más luz y se puede leer mejor'], daniel: ['al fondo hay menos ruido del patio y se pueden concentrar'] }, 1: ['es un buen lugar para leer'], 0: ['le gusta ese lugar'] },
  I15: { 2: ['hay menos ruido y pueden prender la lámpara cuando necesiten luz', 'no hay ruido del patio y tienen una lámpara'], 1: ['hay menos ruido', 'pueden encender la lámpara'], 0: ['hay más luz', 'no sé'] },
  EI5b: { patio: ['hay más espacio para correr', 'se puede jugar mejor'], corredor: ['si llueve no nos mojamos', 'está techado'] },
  I17b: { 2: { patio: ['lo haría en el patio pero si empieza a llover nos pasamos al corredor y dejamos un lado libre para que pase el otro grupo'], corredor: ['lo haría en el corredor con equipos más pequeños y dejando un espacio libre para el otro grupo, así no importa la lluvia'] }, 1: ['lo haría en el corredor porque puede llover', 'en el patio, y si llueve paramos'], 0: ['en el patio porque hay más espacio', 'no cambiaría nada'] },
  I18a: { 2: ['podía llover y otro grupo tenía que pasar por el corredor'], 1: ['podía llover'], 0: ['el juego es divertido'] },
  I18b: { 2: ['si llueve en el patio nos mojamos y en el corredor hay que dejar pasar al otro grupo'], 1: ['es importante'], 0: ['sí'] },
  EI6b: { armada: ['así queda lista para mostrarla', 'no hay que armarla otra vez'], partes: ['es más fácil de llevar', 'pesa menos'] },
  I19b: { 2: { armada: ['la llevaría armada pero de lado para pasar por la puerta y la dejamos lista enseguida, así no gastamos los 10 minutos'], partes: ['la llevaría en partes grandes para pasar por la puerta y entre todos la armamos rápido para que alcancen los 10 minutos'] }, 1: ['la llevaría en partes porque no cabe por la puerta', 'la llevaría armada con cuidado'], 0: ['la llevaría armada porque es más bonita', 'igual'] },
  I20a: { 2: ['la puerta es estrecha y solo tenemos 10 minutos'], 1: ['la puerta es estrecha'], 0: ['la maqueta es grande'] },
  I20b: { 2: ['si no cabe por la puerta se puede dañar y hay poco tiempo para armarla'], 1: ['hay que cuidarla'], 0: ['no sé'] },
};
const al = (l) => l[Math.floor(Math.random() * l.length)];
const texto = (k, q, ctx) => { const t = TEXTOS[k][q]; return Array.isArray(t) ? al(t) : al(t[ctx] || Object.values(t).flat()); };
function calidad(nivel, ajuste) { // nivel de la respuesta abierta (2, 1 o 0) según el nivel del estudiante
  const p = Math.min(0.97, Math.max(0.03, NIVEL[nivel] + ajuste)), p2 = Math.pow(p, 1.4), p0 = Math.pow(1 - p, 1.4), r = Math.random();
  return r < p2 ? 2 : r < 1 - p0 ? 1 : 0;
}
const acierta = (nivel, ajuste) => Math.random() < Math.min(0.97, NIVEL[nivel] + ajuste);
const otra = (opciones, clave) => al(opciones.map((o) => o.v).filter((v) => v !== clave));

// Respuestas de una aplicación completa; devuelve también la calidad "verdadera" de cada ítem de rúbrica (para los calificadores)
function aplicacion(INS, nivel, ajuste, esp = {}) {
  const PC = INS.PC, ITEM = Object.fromEntries(PC.items.map((i) => [i.codigo, i])), resp = {}, q = {}, estado = {}, escriba = {};
  const parte = (c, id) => ITEM[c].partes.find((p) => p.id === id);
  const unico = (c, clave) => (resp[c + 'a'] = acierta(nivel, ajuste) ? clave : otra(parte(c, 'a').opciones, clave));
  // situación 1
  unico('I01', 'A');
  q.I02 = calidad(nivel, ajuste); resp.I02a = q.I02 === 2 ? ['A', 'C'] : q.I02 === 1 ? al([['A'], ['A', 'B', 'C'], ['C']]) : al([['B', 'D'], ['A', 'B', 'C', 'D'], ['B']]); resp.I02b = texto('I02b', q.I02);
  q.I03 = calidad(nivel, ajuste); resp.I03a = al(['salon', 'corredor']); resp.I03b = texto('I03b', q.I03, resp.I03a);
  q.I04 = calidad(nivel, ajuste); resp.I04a = texto('I04', q.I04);
  // situación 2
  q.I05 = calidad(nivel, ajuste); resp.I05a = al(['luciana', 'samuel']); resp.I05b = texto('I05b', q.I05, resp.I05a);
  q.I06 = calidad(nivel, ajuste); resp.I06a = q.I06 === 2 ? { luciana: 'B', samuel: 'D' } : q.I06 === 1 ? al([{ luciana: 'B', samuel: 'A' }, { luciana: 'C', samuel: 'D' }]) : al([{ luciana: 'A', samuel: 'C' }, { luciana: 'D', samuel: 'B' }]);
  resp.I06c = al(['luciana', 'samuel']); resp.I06d = texto('I06d', q.I06, resp.I06c);
  unico('I07', 'A');
  unico('I08', { luciana: 'C', samuel: 'B' }[resp.I05a]);
  // situación 3
  unico('I09', 'B');
  q.I10 = calidad(nivel, ajuste); resp.I10a = texto('I10', q.I10);
  unico('I11', 'C'); unico('I12', 'A');
  // situación 4
  q.I13 = calidad(nivel, ajuste); resp.I13a = q.I13 === 2 ? { mariana: 'C', daniel: 'B' } : q.I13 === 1 ? al([{ mariana: 'C', daniel: 'A' }, { mariana: 'D', daniel: 'B' }]) : al([{ mariana: 'A', daniel: 'D' }, { mariana: 'B', daniel: 'C' }]);
  resp.I13c = al(['mariana', 'daniel']); resp.I13d = texto('I13d', q.I13, resp.I13c);
  unico('I14', 'B');
  q.I15 = calidad(nivel, ajuste); resp.I15a = texto('I15', q.I15);
  unico('I16', 'D');
  // situación 5
  resp.A05a = al(['patio', 'corredor']); resp.A05b = al(TEXTOS.EI5b[resp.A05a]);
  q.I17 = calidad(nivel, ajuste); resp.I17a = al(['mantengo', 'ajusto', 'cambio']);
  const fin5 = resp.I17a === 'cambio' ? { patio: 'corredor', corredor: 'patio' }[resp.A05a] : resp.A05a; resp.I17b = texto('I17b', q.I17, fin5);
  q.I18 = calidad(nivel, ajuste); resp.I18a = texto('I18a', q.I18); resp.I18b = texto('I18b', q.I18);
  // situación 6
  resp.A06a = al(['armada', 'partes']); resp.A06b = al(TEXTOS.EI6b[resp.A06a]);
  q.I19 = calidad(nivel, ajuste); resp.I19a = al(['mantengo', 'ajusto', 'cambio']);
  const fin6 = resp.I19a === 'cambio' ? { armada: 'partes', partes: 'armada' }[resp.A06a] : resp.A06a; resp.I19b = texto('I19b', q.I19, fin6);
  q.I20 = calidad(nivel, ajuste); resp.I20a = texto('I20a', q.I20); resp.I20b = texto('I20b', q.I20);
  // apoyo de escritura: los de nivel bajo dictan algunas respuestas al aplicador
  if (nivel === 'bajo') for (const k of ['I10a', 'I15a', 'I17b', 'I20b']) if (Math.random() < 0.6) escriba[k] = 'aplicador';
  // casos especiales: omisiones e interrupción
  for (const c of esp.omitidos || []) { estado[c] = 'omitido'; for (const p of ITEM[c].partes) delete resp[c + p.id]; delete q[c]; }
  let terminada_antes = false;
  if (esp.terminada) { let corta = false; for (const s of PC.situaciones) { if (s.id === esp.terminada) corta = true; if (corta) for (const et of s.etapas) for (const c of et.items) { estado[c] = 'faltante'; for (const p of ITEM[c].partes) delete resp[c + p.id]; delete q[c]; } } terminada_antes = true; }
  return { resp, q, estado, escriba, terminada_antes };
}
// Puntuación de un calificador a partir de la calidad verdadera: coincide casi siempre; a veces se desvía un punto
function puntuar(q, INS, exactitud) { const out = {}; for (const it of INS.PC.items) if (it.puntuacion.tipo === 'rubrica' && q[it.codigo] != null) { const v = q[it.codigo]; out[it.codigo] = Math.random() < exactitud ? v : Math.max(0, Math.min(2, v + (Math.random() < 0.5 ? -1 : 1))); } return out; }

async function semilla({ base = '', clave, INS, log = console.log, reiniciar = false }) {
  const api = async (ruta, opciones = {}) => {
    const r = await fetch(base + '/api/' + ruta, { ...opciones, headers: { 'content-type': 'application/json', 'x-clave': clave }, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error ' + r.status); return d;
  };
  if (reiniciar) { // todo a la papelera y la papelera vacía
    const D0 = await api('datos');
    for (const p of D0.participantes) await api(`participante?codigo=${p.codigo}`, { method: 'DELETE' });
    for (const x of (await api('papelera')).papelera) await api(`papelera?codigo=${x.codigo}`, { method: 'DELETE' });
    log(`reinicio: ${D0.participantes.length} estudiantes borrados`);
  }
  const D = await api('datos');
  const porCodigo = Object.fromEntries(D.participantes.map((p) => [p.codigo, p]));
  const plan = Object.fromEntries(PLAN.map((f) => [f[0], f]));
  // 1 y 2: nombres, apellidos y plantel
  for (const p of D.participantes) {
    const f = plan[p.codigo]; let row;
    if (f) row = { ...p, nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5], observaciones: f[8] || '' };
    else if (!p.apellido && p.nombre.trim().split(/\s+/).length > 1) { const w = p.nombre.trim().split(/\s+/); row = { ...p, nombre: w[0], apellido: w.slice(1).join(' ') }; }
    if (row && JSON.stringify(row) !== JSON.stringify(p)) { await api('participante', { method: 'PUT', body: { row } }); log(`ajustado ${row.codigo} ${row.nombre} ${row.apellido} (${row.grupo})`); }
  }
  const omitidos = new Set();
  for (const f of PLAN) if (!porCodigo[f[0]]) {
    try { await api('participante', { method: 'PUT', body: { row: { codigo: f[0], nombre: f[1], apellido: f[2], grupo: f[3], sexo: f[4], edad: f[5], observaciones: f[8] || '' }, nuevo: true } }); log(`registrado ${f[0]} ${f[1]} ${f[2]} (${f[3]})`); }
    catch (e) { omitidos.add(f[0]); log(`omitido ${f[0]}: ${e.message}`); } // p. ej. el código está en la papelera
  }
  // 3: aplicaciones y calificaciones que falten
  const hayReg = (c, m) => D.pc.some((r) => r.codigo === c && r.momento === m);
  const hayCal = (c, m, rol) => D.calif.some((r) => r.codigo === c && r.momento === m && r.rol === rol);
  let n = 0, nc = 0;
  for (const [codigo, , , grupo, , , nivel, apl] of PLAN) {
    if (omitidos.has(codigo)) continue;
    for (const tramo of apl.split(/\s+/).filter(Boolean)) {
      const [tag, roles] = tramo.split(':'), m = tag === 'Pre' ? 'Pretest' : 'Postest';
      let q = null;
      if (!hayReg(codigo, m)) {
        const ajuste = m === 'Postest' ? (grupo === 'Experimental' ? 0.18 : (Math.random() - 0.5) * 0.08) : 0;
        const a = aplicacion(INS, nivel, ajuste, ESPECIAL[`${codigo}-${m}`]); q = a.q;
        await api('registro', { method: 'PUT', body: { row: { codigo, momento: m, aplicador: 'Johanna Álvarez', duracion_seg: 1500 + Math.floor(Math.random() * 900), respuestas: a.resp, estado: a.estado, escriba: a.escriba, terminada_antes: a.terminada_antes, observaciones: a.terminada_antes ? 'Se interrumpió por una actividad del colegio; no se pudo retomar.' : '' } } });
        n++; log(`${codigo} ${m}${a.terminada_antes ? ' (interrumpida)' : ''}${Object.keys(a.estado).length ? ' · ' + Object.entries(a.estado).map(([k, v]) => k + ' ' + v).join(', ') : ''}`);
      } else if (roles) { // calidad de referencia para calificar una aplicación ya guardada: nivel del estudiante
        q = {}; for (const it of INS.PC.items) if (it.puntuacion.tipo === 'rubrica') q[it.codigo] = calidad(nivel, 0);
      }
      if (!roles || !q) continue;
      const p1 = puntuar(q, INS, 0.86), p2 = puntuar(q, INS, 0.8);
      if (roles.includes('1') && !hayCal(codigo, m, '1')) { await api('calificacion', { method: 'PUT', body: { codigo, momento: m, rol: '1', calificador: CALIFICADORES[1], puntos: p1 } }); nc++; }
      if (roles.includes('2') && !hayCal(codigo, m, '2')) { await api('calificacion', { method: 'PUT', body: { codigo, momento: m, rol: '2', calificador: CALIFICADORES[2], puntos: p2 } }); nc++; }
      if (roles.includes('F') && !hayCal(codigo, m, 'F')) { await api('calificacion', { method: 'PUT', body: { codigo, momento: m, rol: 'F', calificador: `${CALIFICADORES[1]} y ${CALIFICADORES[2]}`, puntos: q, observaciones: Object.keys(q).some((k) => p1[k] !== p2[k]) ? 'Discrepancias resueltas en revisión conjunta.' : '' } }); nc++; }
    }
  }
  log(`Listo: ${n} aplicaciones y ${nc} calificaciones nuevas.`);
}

if (typeof process !== 'undefined' && process.versions?.node) { // desde Node: node test/semilla.mjs
  const fs = await import('node:fs');
  const env = {}; if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m) env[m[1]] = m[2]; }
  const INS = (await import('../netlify/lib/instrumentos.mjs')).default;
  if (!env.APP_CLAVE) { console.error('Falta el archivo .env con la línea APP_CLAVE=su_clave'); process.exit(1); }
  await semilla({ base: process.env.BASE || 'http://localhost:8888', clave: env.APP_CLAVE, INS, reiniciar: process.argv.includes('--reiniciar') });
}
