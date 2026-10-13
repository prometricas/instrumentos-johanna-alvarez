// Código compartido: utilidades, lógica del instrumento (la misma que en netlify/functions/api.mjs), acuerdo entre
// calificadores y la tabla de respuestas en formato panel con su Excel (SheetJS).
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const z = (n) => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
function toast(t, mal) { const e = $('#toast'); e.textContent = t; e.classList.toggle('mal', !!mal); e.classList.add('ver'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('ver'), 3200); }

async function api(ruta, opciones = {}) {
  const r = await fetch('/api/' + ruta, { ...opciones, headers: { 'content-type': 'application/json', ...(sessionStorage.getItem('clave') ? { 'x-clave': sessionStorage.getItem('clave') } : {}), ...(opciones.headers || {}) }, body: opciones.body ? JSON.stringify(opciones.body) : undefined });
  const d = await r.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
  if (!r.ok) { const e = new Error(d.error || ('Error ' + r.status)); e.status = r.status; throw e; }
  return d;
}

/* ---------- el instrumento ---------- */
const PC = INS.PC;
const ITEMS = PC.items, ITEM = Object.fromEntries(ITEMS.map((i) => [i.codigo, i]));
const PUNTUABLES = ITEMS.filter((i) => !i.auxiliar);
const esCerrado = (it) => it.puntuacion.tipo.startsWith('clave');
const RUBRICA = PUNTUABLES.filter((i) => i.puntuacion.tipo === 'rubrica');
const HAB = Object.fromEntries(PC.habilidades.map((h) => [h.id, h]));
const GRUPOS = ['Piloto', 'Experimental', 'Control'];
const MOMENTOS = ['Pretest', 'Postest'];
const ROLES = ['1', '2', 'F'];
const vacio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.values(v).some((x) => x));
const respondido = (it, resp) => it.partes.some((p) => !vacio(resp[it.codigo + p.id]));
const numItem = (it) => (it.num ? `Ítem ${it.num}` : it.etiqueta);
// Elección final en los ítems 17 y 19: la inicial si la mantiene o la ajusta; la contraria si cambia.
function eleccionFinal(reg, it) {
  const f = it.final; if (!f) return null;
  const ini = reg.respuestas[f.inicial.item + f.inicial.parte], dec = reg.respuestas[it.codigo + f.parte];
  if (!ini || !dec) return null;
  return f.mantiene.includes(dec) ? ini : f.opuestos[ini];
}
const textoOpcion = (p, v) => { const o = (p.opciones || []).find((o) => o.v === v); return o ? o.t : (v ?? ''); };
// Valor de una parte en texto corto (tabla y Excel): letra, código de la opción, "A;C", o el texto escrito.
function valorCorto(p, v) {
  if (vacio(v)) return '';
  if (p.tipo === 'multiple') return v.join(';');
  return String(v);
}
// Puntaje final de un ítem: cerrado = automático; omitido = 0; rúbrica = puntuación acordada (F); faltante = sin dato.
function puntajeItem(reg, calF, it) {
  if (!reg) return null;
  const e = reg.estado?.[it.codigo]; if (e === 'faltante') return null;
  if (esCerrado(it)) { const a = reg.auto?.[it.codigo]; return Number.isInteger(a) ? a : null; }
  if (e === 'omitido') return 0;
  const v = calF?.puntos?.[it.codigo]; return Number.isInteger(v) ? v : null;
}
// Suma por habilidad (0-8) y total (0-40); null si falta algún ítem (regla de la guía de puntuación).
function sumas(reg, calF) {
  const out = {}, pts = {}; PUNTUABLES.forEach((it) => (pts[it.codigo] = puntajeItem(reg, calF, it)));
  for (const h of PC.habilidades) out[h.id] = h.items.every((c) => pts[c] != null) ? h.items.reduce((s, c) => s + pts[c], 0) : null;
  out.total = PUNTUABLES.every((it) => pts[it.codigo] != null) ? PUNTUABLES.reduce((s, it) => s + pts[it.codigo], 0) : null;
  out.items = pts;
  return out;
}
// Puntaje automático de los cerrados (misma regla que el servidor); sirve para el resumen al terminar la aplicación.
function autoPuntajes(resp, estado) {
  const auto = {};
  for (const it of PUNTUABLES) {
    if (!esCerrado(it) || estado[it.codigo] === 'faltante') continue;
    if (estado[it.codigo] === 'omitido') { auto[it.codigo] = 0; continue; }
    const pu = it.puntuacion, v = resp[it.codigo + pu.parte];
    const clave = pu.tipo === 'clave' ? pu.clave : pu.claves[resp[pu.depende.item + pu.depende.parte]];
    auto[it.codigo] = v != null && v === clave ? 2 : 0;
  }
  return auto;
}
const listaNum = (reg, estado) => PUNTUABLES.filter((it) => reg.estado?.[it.codigo] === estado).map((it) => it.num).join(', ');
// Estado de la calificación de una aplicación: pendiente (nadie), parcial (uno de los dos), doble (los dos, sin acuerdo), completa (acordada)
function estadoCalif(cal) {
  const c1 = cal['1'], c2 = cal['2'], f = cal.F;
  if (f && f.completa) return 'completa';
  if (c1 && c1.completa && c2 && c2.completa) return 'doble';
  if (c1 || c2) return 'parcial';
  return 'pendiente';
}
/* ---------- acuerdo entre calificadores ---------- */
// pares: [[a, b], …] con a, b ∈ {0, 1, 2}. Devuelve n, porcentaje de acuerdo exacto y kappa ponderado con pesos lineales
// (κw = 1 − Σ w·o / Σ w·e; w = |i − j| / 2). Si no hay variación suficiente, kappa queda nulo y se informa solo el acuerdo.
function acuerdo(pares) {
  const n = pares.length; if (!n) return { n: 0, pct: null, kappa: null };
  const k = 3, O = Array.from({ length: k }, () => Array(k).fill(0)); pares.forEach(([a, b]) => O[a][b]++);
  const ra = O.map((r) => r.reduce((s, x) => s + x, 0)), rb = [0, 1, 2].map((j) => O.reduce((s, r) => s + r[j], 0));
  let num = 0, den = 0, ex = 0;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const w = Math.abs(i - j) / (k - 1); num += w * O[i][j] / n; den += w * (ra[i] / n) * (rb[j] / n); if (i === j) ex += O[i][j]; }
  return { n, pct: 100 * ex / n, kappa: den > 0 ? 1 - num / den : null, matriz: O };
}
const fmtK = (k) => (k == null ? '—' : (Math.round(k * 100) / 100).toFixed(2).replace('.', ','));
const fmtPct = (p) => (p == null ? '—' : Math.round(p) + ' %');
const calDe = (datos, codigo, m) => { const o = {}; for (const r of datos.calif) if (r.codigo === codigo && r.momento === m) o[r.rol] = r; return o; };
const regDe = (datos, codigo, m) => datos.pc.find((r) => r.codigo === codigo && r.momento === m);

/* ---------- tabla de respuestas (formato panel: una fila por estudiante y momento) ---------- */
const FIJAS = [['grupo', 'Grupo'], ['codigo', 'Codigo'], ['nombre', 'Nombre'], ['apellido', 'Apellido'], ['momento', 'Momento'], ['sexo', 'Sexo'], ['edad', 'Edad']];
// Bloques de columnas: meta (protocolo, fecha, aplicador, duración), hab (habilidades y total), item (puntaje final por ítem),
// calif (puntuación de cada calificador), resp (respuestas tal como se dieron). op = {meta, calif, items, resp}.
function columnasRespuestas(op = {}) {
  const cols = [], c = (bloque, id, texto, valor, tipo = bloque) => cols.push({ bloque, id, texto, valor, tipo });
  c('meta', 'Protocolo', 'Código de protocolo con el que se calificó la aplicación', (r) => r.protocolo || '');
  if (op.meta) {
    c('meta', 'FechaHora', 'Fecha y hora de la aplicación', (r) => r.fecha_hora || r.fecha || '');
    c('meta', 'Aplicador', 'Quién aplicó la prueba', (r) => r.aplicador || '');
    c('meta', 'Duracion', 'Duración de la aplicación en segundos', (r) => r.duracion_seg ?? '');
  }
  for (const h of PC.habilidades) c('hab', h.col, `${h.nombre} (ítems ${h.items.map((x) => ITEM[x].num).join(', ')}; 0-8). Vacío si falta un ítem.`, (r, cal) => sumas(r, cal.F)[h.id] ?? '');
  c('hab', PC.total.col, PC.total.etiqueta + '. Vacío si falta un ítem.', (r, cal) => sumas(r, cal.F).total ?? '');
  if (op.items !== false) {
    for (const it of PUNTUABLES) c('item', it.col, `Ítem ${it.num} · ${HAB[it.habilidad].corto} · ${it.sub} (${esCerrado(it) ? 'clave, 0 o 2' : 'rúbrica, 0-2, puntuación acordada'})`, (r, cal) => puntajeItem(r, cal.F, it) ?? '');
    c('item', 'Omitidos', 'Ítems que el estudiante no respondió teniendo oportunidad (puntúan 0)', (r) => listaNum(r, 'omitido'));
    c('item', 'Faltantes', 'Ítems sin oportunidad de respuesta (dato faltante, no puntúan)', (r) => listaNum(r, 'faltante'));
  }
  if (op.calif) {
    for (const rol of ['1', '2']) for (const it of RUBRICA) c('calif', `C${rol}_${z(it.num)}`, `Calificador ${rol} · ítem ${it.num}`, (r, cal) => cal[rol]?.puntos?.[it.codigo] ?? '');
    c('calif', 'Calificador1', 'Nombre del calificador 1', (r, cal) => cal['1']?.calificador || '');
    c('calif', 'Calificador2', 'Nombre del calificador 2', (r, cal) => cal['2']?.calificador || '');
    c('calif', 'Acuerdo', 'Fecha de la puntuación acordada', (r, cal) => (cal.F?.completa ? cal.F.fecha : ''));
  }
  if (op.resp !== false) {
    for (const it of ITEMS) {
      for (const p of it.partes) {
        if (p.tipo === 'union') for (const f of p.filas) c('resp', f.col, `${numItem(it)} · ${p.pregunta} (${f.nombre})`, (r) => r.respuestas[it.codigo + p.id]?.[f.id] ?? '');
        else c('resp', p.col, `${numItem(it)} · ${p.pregunta || p.prefijo || ''}`, (r) => valorCorto(p, r.respuestas[it.codigo + p.id]));
        if (it.final && p.id === it.final.parte) c('resp', it.final.col, `${numItem(it)} · elección final (inicial mantenida o cambiada)`, (r) => eleccionFinal(r, it) ?? '');
      }
    }
    c('resp', 'EscribeAplicador', 'Ítems cuya respuesta abierta escribió el aplicador al dictado del estudiante', (r) => [...new Set(Object.keys(r.escriba || {}).map((k) => ITEM[k.slice(0, 3)]).filter(Boolean).map((it) => it.num || it.etiqueta))].join(', '));
  }
  return cols;
}
function filasRespuestas(datos, cols, grupo) {
  const out = [];
  for (const p of datos.participantes.filter((p) => !grupo || p.grupo === grupo).sort((a, b) => a.codigo.localeCompare(b.codigo))) {
    for (const m of MOMENTOS) {
      const o = {}; FIJAS.forEach(([k]) => (o[k] = k === 'momento' ? m : (p[k] ?? '')));
      const r = regDe(datos, p.codigo, m), cal = r ? calDe(datos, p.codigo, m) : {};
      for (const c of cols) o[c.id] = r ? c.valor(r, cal) : '';
      out.push(o);
    }
  }
  return out;
}
const anchoCol = (k) => ({ wch: k === 'nombre' || k === 'apellido' ? 16 : k === 'grupo' || k === 'momento' ? 13 : 8 });
function construirExcel(datos, op = {}) { // una hoja por grupo; con "calif", además una hoja de acuerdo entre calificadores
  const wb = XLSX.utils.book_new(), cols = columnasRespuestas(op);
  const enc = FIJAS.map(([, t]) => t).concat(cols.map((c) => c.id));
  for (const g of GRUPOS) {
    const filas = filasRespuestas(datos, cols, g).map((o) => FIJAS.map(([k]) => o[k]).concat(cols.map((c) => o[c.id])));
    const ws = XLSX.utils.aoa_to_sheet([enc].concat(filas));
    ws['!cols'] = FIJAS.map(([k]) => anchoCol(k)).concat(cols.map((c) => ({ wch: c.bloque === 'resp' && !/^(R\d\d|EI\d)[a-z]?$/.test(c.id) ? 14 : c.bloque === 'resp' && ITEMS.some((it) => it.partes.some((p) => p.col === c.id && p.tipo === 'texto')) ? 28 : Math.max(8, c.id.length + 1) })));
    XLSX.utils.book_append_sheet(wb, ws, g);
  }
  if (op.calif) {
    const A = estadisticasAcuerdo(datos);
    const filas = [['Item', 'Habilidad', 'Protocolos', 'AcuerdoExacto', 'KappaPonderado']].concat(A.items.map((x) => [x.num, x.hab, x.n, x.pct == null ? '' : Math.round(x.pct * 10) / 10, x.kappa == null ? '' : Math.round(x.kappa * 1000) / 1000])).concat([['Todos', '', A.total.n, A.total.pct == null ? '' : Math.round(A.total.pct * 10) / 10, A.total.kappa == null ? '' : Math.round(A.total.kappa * 1000) / 1000]]);
    const ws = XLSX.utils.aoa_to_sheet(filas); ws['!cols'] = [{ wch: 7 }, { wch: 24 }, { wch: 11 }, { wch: 14 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Acuerdo');
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
// Acuerdo entre los calificadores 1 y 2 sobre los ítems de rúbrica, en todos los protocolos con las dos calificaciones
// (grupo Piloto incluido: también sirve para entrenar la calificación). Excluye los ítems omitidos (0 por regla) y faltantes.
function estadisticasAcuerdo(datos, filtro = null) {
  const pares = Object.fromEntries(RUBRICA.map((it) => [it.codigo, []]));
  for (const r of datos.pc) {
    if (filtro && !filtro(r)) continue;
    const cal = calDe(datos, r.codigo, r.momento); if (!cal['1'] || !cal['2']) continue;
    for (const it of RUBRICA) { const e = r.estado?.[it.codigo]; if (e) continue; const a = cal['1'].puntos?.[it.codigo], b = cal['2'].puntos?.[it.codigo]; if (Number.isInteger(a) && Number.isInteger(b)) pares[it.codigo].push([a, b]); }
  }
  const items = RUBRICA.map((it) => ({ codigo: it.codigo, num: it.num, hab: HAB[it.habilidad].corto, ...acuerdo(pares[it.codigo]) }));
  return { items, total: acuerdo(Object.values(pares).flat()) };
}
function descargar(data, nombre, tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tipo })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
