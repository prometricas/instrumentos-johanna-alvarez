let D = null; // datos: {participantes, pc, calif, papelera}
let vista = 'estudiantes';
const porGrupo = (lista) => GRUPOS.map((g) => [g, lista.filter((x) => x.grupo === g)]).filter(([, l]) => l.length);
const DESC = { Piloto: 'Grupo de prueba del instrumento; sus datos no entran en el análisis.', Experimental: 'Grupo que recibe la intervención; medición antes (pretest) y después (postest).', Control: 'Grupo sin intervención; se mide en los mismos momentos, para comparar.' };
let grupoActivo = localStorage.getItem('grupoActivo') || 'Piloto';
function tabsGrupo(lista, cuenta, extra = '') {
  return `<div class="gbar"><div class="gtabs">${GRUPOS.map((g) => `<button data-g="${g}" class="g-${g.toLowerCase()} ${g === grupoActivo ? 'activo' : ''}">${g}<b>${cuenta(lista.filter((x) => x.grupo === g))}</b></button>`).join('')}</div><p class="gdesc g-${grupoActivo.toLowerCase()}" title="${DESC[grupoActivo]}">${DESC[grupoActivo]}</p>${extra}</div>`;
}
// filtro por nombre o código sobre las filas de una tabla ya dibujada (sin volver a dibujar, para no perder el foco)
function filtrarFilas(input, tabla, msg) {
  const q = input.value.trim().toLowerCase(); let n = 0;
  tabla.querySelectorAll('tbody tr').forEach((tr) => { const ok = !q || tr.textContent.toLowerCase().includes(q); tr.classList.toggle('oculto', !ok); n += ok; });
  if (msg) msg.textContent = q ? `${n} coincidencia${n === 1 ? '' : 's'}` : '';
}
function activarTabs(cont, onChange) { cont.querySelectorAll('.gtabs button').forEach((b) => b.addEventListener('click', () => { grupoActivo = b.dataset.g; localStorage.setItem('grupoActivo', grupoActivo); onChange(); })); }
const nom = (p) => [p.nombre, p.apellido].filter(Boolean).join(' ');
const codigoUsado = (c) => D.participantes.some((p) => p.codigo === c) || (D.papelera || []).some((p) => p.codigo === c);
const nombreDe = (c) => { const p = D.participantes.find((p) => p.codigo === c); return p ? nom(p) : ''; };
const reg = (c, m) => regDe(D, c, m);
const cal = (c, m) => calDe(D, c, m);
const nReg = (c) => D.pc.filter((r) => r.codigo === c).length;
function papeleraHtml() {
  const L = D.papelera || []; if (!L.length) return '';
  return `<details class="papelera"><summary>Papelera: ${L.length} estudiante${L.length > 1 ? 's' : ''} eliminado${L.length > 1 ? 's' : ''} con sus registros guardados</summary><ul>${L.map((x) => `<li><span><b>${esc(x.codigo)}</b> ${esc(nom(x))} · ${x.registros} aplicaci${x.registros === 1 ? 'ón' : 'ones'} · eliminado el ${esc(x.fecha_papelera)}</span><button class="btn chico sec" data-rest="${esc(x.codigo)}">Recuperar</button><button class="btn chico" style="background:#fff;color:var(--mal);border:1px solid #EFC6C2" data-purga="${esc(x.codigo)}">Borrar definitivamente</button></li>`).join('')}</ul></details>`;
}

/* ---------- entrada ---------- */
async function entrar(clave) {
  sessionStorage.setItem('clave', clave);
  try { await api('entrar', { method: 'POST', body: { clave } }); }
  catch (e) { sessionStorage.removeItem('clave'); throw e; }
  await cargar();
  $('#entrada').classList.add('oculto'); $('#app').classList.remove('oculto');
  ir(VISTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'estudiantes');
  pintarCola(); enviarCola();
  if (leerAvance() && vista !== 'aplicar') toast('Hay una aplicación sin terminar guardada en este dispositivo (en Aplicar al estudiante)');
}
$('#btnEntrar').addEventListener('click', async () => {
  const c = $('#clave').value; if (!c) return;
  $('#btnEntrar').disabled = true;
  try { await entrar(c); } catch (e) { $('#entradaMsg').innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; }
  $('#btnEntrar').disabled = false;
});
$('#clave').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnEntrar').click(); });
$('#btnSalir').addEventListener('click', () => { sessionStorage.removeItem('clave'); location.reload(); });
async function cargar() {
  $('#cargando').classList.remove('oculto');
  try { const [d, p] = await Promise.all([api('datos'), api('papelera')]); D = d; D.papelera = p.papelera; }
  finally { $('#cargando').classList.add('oculto'); }
}
/* ---------- diálogo propio (reemplaza confirm/prompt del navegador); "otro" añade un tercer botón ---------- */
function dialogo({ titulo, texto, ok = 'Aceptar', cancelar = 'Cancelar', otro = null, peligro = false, escribir = null }) {
  return new Promise((res) => {
    $('#dTitulo').textContent = titulo; $('#dTexto').textContent = texto;
    $('#dCampo').classList.toggle('oculto', !escribir); $('#dCampo').classList.remove('falta'); $('#dInput').value = '';
    if (escribir) $('#dLabel').textContent = `Para confirmar, escriba ${escribir}`;
    $('#dOk').textContent = ok; $('#dOk').className = 'btn' + (peligro ? ' peligro' : ''); $('#dCancelar').textContent = cancelar;
    $('#dOtro').classList.toggle('oculto', !otro); if (otro) $('#dOtro').textContent = otro;
    $('#dialogo').classList.remove('oculto');
    const coincide = () => !escribir || $('#dInput').value.trim().toUpperCase() === escribir.toUpperCase();
    const fin = (v) => { $('#dialogo').classList.add('oculto'); $('#dOk').onclick = $('#dCancelar').onclick = $('#dOtro').onclick = null; document.removeEventListener('keydown', tecla, true); res(v); };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fin(false); } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.stopPropagation(); if (coincide()) fin(true); else $('#dCampo').classList.add('falta'); } };
    $('#dOk').onclick = () => { if (!coincide()) { $('#dCampo').classList.add('falta'); $('#dInput').focus(); return; } fin(true); };
    $('#dCancelar').onclick = () => fin(false);
    $('#dOtro').onclick = () => fin('otro');
    document.addEventListener('keydown', tecla, true);
    (escribir ? $('#dInput') : $('#dOk')).focus();
  });
}
$('#dialogo').addEventListener('click', (e) => { if (e.target === $('#dialogo')) $('#dCancelar').click(); });

/* ---------- navegación ---------- */
const VISTAS = { estudiantes: () => verEstudiantes(), aplicar: () => verAplicar(), calificar: () => verCalificar(), respuestas: () => verRespuestas() };
let origen = null; // módulo desde el que se llegó con una marca pendiente, para poder volver
function ir(v) {
  vista = v;
  document.querySelectorAll('main > section').forEach((s) => s.classList.toggle('oculto', s.id !== 'v-' + v));
  document.querySelectorAll('nav.menu button[data-v]').forEach((b) => b.classList.toggle('activo', b.dataset.v === v));
  document.querySelectorAll('[data-volver]').forEach((a) => a.classList.toggle('oculto', !(origen && origen !== v)));
  $('#ayudaBtn').classList.toggle('oculto', v !== 'aplicar'); if (v !== 'aplicar') $('#ayudaPanel').classList.add('oculto');
  if (!location.hash) history.replaceState(null, '', '#' + v); else if (location.hash !== '#' + v) history.pushState(null, '', '#' + v); // el botón Atrás del navegador vuelve al módulo anterior
  VISTAS[v]();
}
document.querySelectorAll('nav.menu button[data-v]').forEach((b) => b.addEventListener('click', () => { origen = null; if (b.dataset.v === 'calificar') calVista = 'lista'; ir(b.dataset.v); }));
$('#logoInicio').addEventListener('click', (e) => { e.preventDefault(); if (D) { origen = null; ir('estudiantes'); } }); // el logo lleva a Estudiantes
document.querySelectorAll('[data-volver]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const o = origen; origen = null; ir(o); }));
window.addEventListener('popstate', () => {
  if (K) { history.pushState(null, '', '#aplicar'); return; } // durante una aplicación, Atrás no hace nada
  const v = location.hash.slice(1); if (VISTAS[v] && D) { origen = null; if (v === 'calificar') calVista = 'lista'; ir(v); }
});
async function recargar() { try { await cargar(); ir(vista); } catch (e) { toast(e.message, true); } }
function seg(id, onChange) { const el = $(id); el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { el.querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x === b)); onChange && onChange(b.dataset.m); })); return () => el.querySelector('.activo').dataset.m; }
function guionHtml() { return `<h4>Guion · ${esc(PC.corto)}</h4><p>Diga al niño(a): <i>«${esc(PC.guion.diga)}»</i></p><p>${esc(PC.guion.haga)}</p><p>${esc(PC.guion.etapas)}</p><p class="teclas">Teclas: 1-4 marcan la opción, Enter avanza (en un cuadro de texto, Ctrl+Enter).</p>`; }

/* ---------- estudiantes ---------- */
const ET = { Pretest: 'Pre', Postest: 'Post' };
function verEstudiantes() {
  const ps = D.participantes;
  $('#resumenP').textContent = ps.length ? `${ps.length} estudiante${ps.length > 1 ? 's' : ''} · ` + porGrupo(ps).map(([g, l]) => `${l.length} ${g.toLowerCase()}`).join(' · ') : '';
  const marcaApl = (c, m) => { const r = reg(c, m); return r ? `<span class="estado si" role="button" tabindex="0" data-ficha="${esc(c)}" title="Aplicada el ${esc(r.fecha)}. Pulse para ver la ficha">${ET[m]} ✓</span>` : `<span class="estado pend" role="button" tabindex="0" data-apl="${esc(c)}" data-m="${m}" title="Sin aplicar. Pulse para aplicar ahora">${ET[m]} ·</span>`; };
  const marcaCal = (c, m) => {
    const r = reg(c, m); if (!r) return `<span class="estado nada" title="Aún no se aplica">${ET[m]} –</span>`;
    const e = estadoCalif(cal(c, m)), n = ['1', '2'].filter((x) => cal(c, m)[x]?.completa).length;
    const t = { completa: ['si', '✓', 'Puntuación acordada. Pulse para revisarla'], doble: ['medio', '2/2', 'Calificada por los dos; falta el acuerdo. Pulse para acordar'], parcial: ['medio', `${n}/2`, 'Calificación en proceso. Pulse para calificar'], pendiente: ['pend', '·', 'Sin calificar. Pulse para calificar'] }[e];
    return `<span class="estado ${t[0]}" role="button" tabindex="0" data-cal="${esc(c)}" data-m="${m}" data-e="${e}" title="${t[2]}">${ET[m]} ${t[1]}</span>`;
  };
  const filaP = (p) => { const n = nReg(p.codigo); return `<tr><td><b>${esc(p.codigo)}</b></td><td><a href="#" data-ficha="${esc(p.codigo)}" title="Abrir la ficha del estudiante">${esc(nom(p))}</a></td><td>${esc(p.sexo)}</td><td>${esc(p.edad)}</td>` +
      `<td>${marcaApl(p.codigo, 'Pretest')}${marcaApl(p.codigo, 'Postest')}</td><td>${marcaCal(p.codigo, 'Pretest')}${marcaCal(p.codigo, 'Postest')}</td>` +
      `<td><button class="x ${n ? 'con-datos' : ''}" data-del="${esc(p.codigo)}" title="${n ? `Eliminar (tiene ${n} aplicaci${n > 1 ? 'ones' : 'ón'}; se guardan en la papelera)` : 'Eliminar estudiante'}">×</button></td></tr>`; };
  const lista = ps.filter((p) => p.grupo === grupoActivo);
  const buscar = lista.length > 5 ? `<div class="buscar"><input id="pBuscar" placeholder="Buscar por nombre o código" aria-label="Buscar estudiante"><span id="pBuscarN"></span></div>` : '';
  $('#tablaP').innerHTML = tabsGrupo(ps, (l) => l.length, buscar) + (lista.length ? `<table class="datos"><thead><tr><th>Código</th><th>Nombre</th><th>Sexo</th><th>Edad</th><th>Prueba<small>${esc(PC.tecnico)}</small></th><th>Calificación<small>dos calificadores y acuerdo</small></th><th></th></tr></thead><tbody>` + lista.map(filaP).join('') + '</tbody></table>'
    : `<div class="aviso nota">Aún no hay estudiantes en el grupo ${grupoActivo}. Regístrelos con el formulario de arriba.</div>`) + papeleraHtml();
  activarTabs($('#tablaP'), verEstudiantes);
  $('#pBuscar')?.addEventListener('input', () => filtrarFilas($('#pBuscar'), $('#tablaP table'), $('#pBuscarN')));
  const cod = $('#pCodigo').value.trim().toUpperCase();
  if (!cod || codigoUsado(cod)) { const n = Math.max(0, ...ps.concat(D.papelera || []).map((p) => Number((p.codigo.match(/^E(\d+)$/) || [])[1]) || 0)) + 1; $('#pCodigo').value = 'E' + z(n); } // siguiente al mayor usado: un código nunca se repite
  $('#tablaP').querySelectorAll('[data-ficha]').forEach((ch) => ch.addEventListener('click', () => verEstudiante(ch.dataset.ficha)));
  $('#tablaP').querySelectorAll('[data-apl]').forEach((ch) => ch.addEventListener('click', () => irAplicar(ch.dataset.apl, ch.dataset.m)));
  $('#tablaP').querySelectorAll('[data-cal]').forEach((ch) => ch.addEventListener('click', () => irCalificar(ch.dataset.cal, ch.dataset.m, ch.dataset.e)));
  $('#tablaP').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const c = b.dataset.del, n = nReg(c);
    const ok = n ? await dialogo({ titulo: 'Eliminar estudiante', texto: `${c} ${nombreDe(c)} tiene ${n} aplicaci${n > 1 ? 'ones' : 'ón'} guardada${n > 1 ? 's' : ''} (con sus calificaciones). El estudiante y sus registros pasan a la papelera, desde donde puede recuperarlos.`, ok: 'Mover a la papelera', peligro: true, escribir: c })
      : await dialogo({ titulo: 'Eliminar estudiante', texto: `¿Eliminar a ${c} ${nombreDe(c)}? No tiene aplicaciones guardadas.`, ok: 'Eliminar', peligro: true });
    if (!ok) return;
    try { await api(`participante?codigo=${c}`, { method: 'DELETE' }); toast(n ? 'Movido a la papelera con sus registros' : 'Estudiante eliminado'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
  $('#tablaP').querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('restaurar', { method: 'POST', body: { codigo: b.dataset.rest } }); toast('Estudiante recuperado con sus registros'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
  $('#tablaP').querySelectorAll('[data-purga]').forEach((b) => b.addEventListener('click', async () => {
    const c = b.dataset.purga;
    if (!(await dialogo({ titulo: 'Borrar definitivamente', texto: `Esto borra para siempre a ${c} ${nom(D.papelera.find((x) => x.codigo === c) || {})} y sus registros de la papelera. No se puede deshacer.`, ok: 'Borrar definitivamente', peligro: true, escribir: c }))) return;
    try { await api(`papelera?codigo=${c}`, { method: 'DELETE' }); toast('Borrado definitivamente'); await recargar(); } catch (e) { toast(e.message, true); }
  }));
}
['#pGrupo', '#pSexo'].forEach((id) => $(id).addEventListener('change', () => $(id).classList.toggle('vacio', !$(id).value)));
document.querySelectorAll('#v-estudiantes .campo input, #v-estudiantes .campo select').forEach((el) => el.addEventListener('input', () => el.closest('.campo').classList.remove('falta')));
$('#btnAddP').addEventListener('click', async () => {
  const row = { codigo: $('#pCodigo').value.trim().toUpperCase(), nombre: $('#pNombre').value.trim(), apellido: $('#pApellido').value.trim(), grupo: $('#pGrupo').value, sexo: $('#pSexo').value, edad: $('#pEdad').value };
  const m = $('#pMsg'), faltan = [];
  document.querySelectorAll('#v-estudiantes .campo').forEach((c) => c.classList.remove('falta'));
  const falta = (id, texto) => { $(id).closest('.campo').classList.add('falta'); faltan.push(texto); };
  if (!row.codigo) falta('#pCodigo', 'el código');
  else if (!/^[A-Z0-9]{1,8}$/.test(row.codigo)) falta('#pCodigo', 'un código válido (solo letras y números, máximo 8)');
  else if (D.participantes.some((p) => p.codigo === row.codigo)) { const d = D.participantes.find((p) => p.codigo === row.codigo); falta('#pCodigo', `otro código: ${row.codigo} ya lo tiene ${nom(d)}; para dárselo a este estudiante cambie primero el código de ${nom(d)} desde su ficha`); }
  else if ((D.papelera || []).some((p) => p.codigo === row.codigo)) falta('#pCodigo', `otro código (${row.codigo} está en la papelera)`);
  if (!row.nombre) falta('#pNombre', 'el nombre');
  if (!row.apellido) falta('#pApellido', 'el apellido');
  if (!row.grupo) falta('#pGrupo', 'el grupo');
  if (!row.sexo) falta('#pSexo', 'el sexo');
  if (!row.edad) falta('#pEdad', 'la edad');
  if (faltan.length) { m.innerHTML = `<div class="aviso mal">Falta ${faltan.join(', ').replace(/, ([^,]*)$/, ' y $1')}.</div>`; $('#v-estudiantes .campo.falta input, #v-estudiantes .campo.falta select')?.focus(); return; }
  try {
    await api('participante', { method: 'PUT', body: { row, nuevo: true } });
    m.innerHTML = `<div class="aviso ok">Registrado ${esc(row.codigo)} · ${esc(row.nombre)} ${esc(row.apellido)}.</div>`;
    $('#pCodigo').value = ''; $('#pNombre').value = ''; $('#pApellido').value = ''; $('#pEdad').value = ''; $('#pSexo').value = ''; $('#pSexo').classList.add('vacio'); grupoActivo = row.grupo; localStorage.setItem('grupoActivo', grupoActivo);
    await recargar(); $('#pNombre').focus();
  } catch (e) { m.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; }
});

/* ---------- ficha del estudiante ---------- */
const fmtDur = (seg) => (seg >= 90 ? `${Math.round(seg / 60)} min` : `${seg} s`);
function avatar(sexo) { // niño o niña según el sexo registrado
  const nina = sexo === 'Femenino', pelo = '#4A3222', piel = '#F5C9A6', ropa = nina ? '#648ACA' : '#003058', id = nina ? 'av-f' : 'av-m';
  return `<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="31"/></clipPath></defs><circle cx="32" cy="32" r="31" fill="#E6EDF6"/><g clip-path="url(#${id})">
    <path d="M10 66c0-12 10-19 22-19s22 7 22 19z" fill="${ropa}"/>${nina ? `<path d="M16 31c0-12 7-19 16-19s16 7 16 19v16H16z" fill="${pelo}"/>` : ''}
    <circle cx="32" cy="29" r="12.5" fill="${piel}"/>
    ${nina ? `<path d="M19.5 29.5c0-9.5 5.5-14.5 12.5-14.5s12.5 5 12.5 14.5c-3-5-6-7-9-7-3 2-7 2-10 0-3 0-5 2-6 7z" fill="${pelo}"/>` : `<path d="M19.5 28c0-9 5.5-13.5 12.5-13.5S44.5 19 44.5 28c-3-4.5-6-6.5-9-6.5-3 2-7 2-10 0-3 0-5 2-6 6.5z" fill="${pelo}"/>`}
    <circle cx="27.5" cy="30.5" r="1.6" fill="#1C2433"/><circle cx="36.5" cy="30.5" r="1.6" fill="#1C2433"/><path d="M28 35.5q4 3 8 0" stroke="#1C2433" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="24" cy="34.5" r="2" fill="#F08A8A" opacity=".45"/><circle cx="40" cy="34.5" r="2" fill="#F08A8A" opacity=".45"/></g></svg>`;
}
const chipCal = (c, m) => { // estado de la calificación de una aplicación, para la ficha
  const C = cal(c, m), e = estadoCalif(C), n1 = C['1'], n2 = C['2'];
  const c1 = n1 ? `<span class="${n1.completa ? 'ok' : 'medio'}">Calificador 1${n1.calificador ? ': ' + esc(n1.calificador) : ''}${n1.completa ? ' ✓' : ' (en proceso)'}</span>` : '<span>Calificador 1: pendiente</span>';
  const c2 = n2 ? `<span class="${n2.completa ? 'ok' : 'medio'}">Calificador 2${n2.calificador ? ': ' + esc(n2.calificador) : ''}${n2.completa ? ' ✓' : ' (en proceso)'}</span>` : '<span>Calificador 2: pendiente</span>';
  const f = e === 'completa' ? `<span class="ok">Acordada el ${esc(C.F.fecha)} ✓</span>` : e === 'doble' ? '<span class="medio">Acuerdo pendiente</span>' : '';
  return `<div class="calif-est">${c1}${c2}${f}<button class="lnk chico" data-cal="${esc(c)}" data-m="${m}" data-e="${e}">${e === 'completa' ? 'Ver acuerdo' : e === 'doble' ? 'Acordar' : 'Calificar'}</button></div>`;
};
function fichaPrueba(codigo) {
  const regs = MOMENTOS.map((m) => reg(codigo, m)), S = MOMENTOS.map((m, i) => (regs[i] ? sumas(regs[i], cal(codigo, m).F) : null));
  const celda = (v) => `<td>${v ?? '<span class="nada">–</span>'}</td>`;
  const filas = PC.habilidades.map((h) => { const v = S.map((s) => (s ? s[h.id] : null)), camb = v[0] != null && v[1] != null ? v[1] - v[0] : null; return `<tr><td><span title="${esc(h.nombre)} (ítems ${h.items.map((x) => ITEM[x].num).join(', ')})">${esc(h.corto)} <small>0-8</small></span></td>${v.map(celda).join('')}<td class="camb ${camb > 0 ? 'mas' : camb < 0 ? 'menos' : ''}">${camb == null ? '' : (camb > 0 ? '+' : '') + camb}</td></tr>`; }).join('') +
    (() => { const v = S.map((s) => (s ? s.total : null)), camb = v[0] != null && v[1] != null ? v[1] - v[0] : null; return `<tr class="total"><td><span title="${esc(PC.total.etiqueta)}">Total <small>0-40</small></span></td>${v.map(celda).join('')}<td class="camb ${camb > 0 ? 'mas' : camb < 0 ? 'menos' : ''}">${camb == null ? '' : (camb > 0 ? '+' : '') + camb}</td></tr>`; })();
  const obs = (r) => (r.observaciones ? ` · <i>${esc(r.observaciones)}</i>` : '');
  const meta = MOMENTOS.map((m, i) => { const r = regs[i]; if (!r) return `<div class="meta"><span><b>${m}</b> sin aplicar</span><button class="lnk chico" data-aplicar data-c="${esc(codigo)}" data-m="${m}">Aplicar ahora</button></div>`;
    const om = listaNum(r, 'omitido'), fa = listaNum(r, 'faltante');
    return `<div class="meta"><span><b>${m}</b> ${esc(r.fecha_hora || r.fecha)} · aplicó ${esc(r.aplicador)} · ${fmtDur(r.duracion_seg)} · protocolo <span style="white-space:nowrap">${esc(r.protocolo || '')}</span>${om ? ` · omitidos: ${om}` : ''}${fa ? ` · sin oportunidad: ${fa}` : ''}${r.orden ? ` · orden de las situaciones: ${ordenNums(r)}` : ''}${r.terminada_antes ? ' · terminada antes del final' : ''}${obs(r)}${chipCal(codigo, m)}</span><button class="lnk chico mal" data-borrar data-c="${esc(codigo)}" data-m="${m}">Eliminar</button></div>`; }).join('');
  const pend = regs.some((r, i) => r && S[i].total == null) ? '<p class="guia" style="margin:6px 0 0;font-size:.85em">Las sumas aparecen cuando la puntuación acordada está completa y ningún ítem queda sin oportunidad de respuesta.</p>' : '';
  return `<div class="prueba"><h3>${esc(PC.corto)}<span>${esc(PC.titulo)}</span></h3><table class="dims"><thead><tr><th></th><th>Pretest</th><th>Postest</th><th title="Postest menos pretest">Cambio</th></tr></thead><tbody>${filas}</tbody></table>${pend}${meta}</div>`;
}
function fichaItems(codigo) { // respuestas y puntaje de cada ítem, pre y post
  const regs = MOMENTOS.map((m) => reg(codigo, m)); if (!regs.some(Boolean)) return '';
  const S = MOMENTOS.map((m, i) => (regs[i] ? sumas(regs[i], cal(codigo, m).F) : null));
  const resp = (r, it) => { if (!r) return '<span class="nada">–</span>'; const e = r.estado?.[it.codigo]; if (e === 'faltante') return '<i>sin oportunidad</i>'; if (e === 'omitido') return '<i>omitió</i>';
    return it.partes.map((p) => { const v = r.respuestas[it.codigo + p.id]; if (vacio(v)) return ''; if (p.tipo === 'union') return p.filas.map((f) => `${f.nombre} → ${v[f.id] || '–'}`).join(' · '); if (p.tipo === 'texto') return `«${esc(v)}»`; if (p.tipo === 'multiple') return v.join(', '); return p.letras ? v : esc(textoOpcion(p, v)); }).filter(Boolean).join(' · '); };
  const pt = (i, it) => { if (!regs[i]) return '–'; if (it.auxiliar) return ''; const v = S[i].items[it.codigo]; return v == null ? (regs[i].estado?.[it.codigo] === 'faltante' ? '–' : '<span class="nada" title="Pendiente de calificación acordada">?</span>') : v; };
  const resumen = MOMENTOS.map((m, i) => { const r = regs[i]; if (!r) return `<span><b>${m}:</b> sin aplicar</span>`; const n = PUNTUABLES.filter((it) => !r.estado?.[it.codigo]).length, om = listaNum(r, 'omitido'), fa = listaNum(r, 'faltante'), c = estadoCalif(cal(codigo, m)); return `<span><b>${m}:</b> ${n} de ${PUNTUABLES.length} ítems respondidos${om ? ` · omitidos: ${om}` : ''}${fa ? ` · sin oportunidad: ${fa}` : ''} · calificación ${{ completa: 'acordada', doble: 'por acordar', parcial: 'en proceso', pendiente: 'pendiente' }[c]}</span>`; }).join('');
  return `<div class="prueba"><h3>Respuestas y puntaje de cada ítem<span>Puntaje final: clave en los cerrados, puntuación acordada en los de rúbrica; «?» = pendiente de acordar</span></h3><div class="resumen-items">${resumen}</div><details class="items-ficha"><summary>Ver los ${ITEMS.length} ítems</summary><table class="items-tab"><thead><tr><th>Ítem</th><th>Pretest</th><th class="pt">Pts</th><th>Postest</th><th class="pt">Pts</th></tr></thead><tbody>${ITEMS.map((it) => `<tr><td><b>${it.num ?? 'EI'}</b> <small>${esc(it.sub || it.etiqueta)}</small></td><td class="txt">${resp(regs[0], it)}</td><td class="pt">${pt(0, it)}</td><td class="txt">${resp(regs[1], it)}</td><td class="pt">${pt(1, it)}</td></tr>`).join('')}</tbody></table></details></div>`;
}
function verEstudiante(codigo, editar = false) {
  const p = D.participantes.find((x) => x.codigo === codigo); if (!p) return;
  const op = (lista, v) => lista.map((x) => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  $('#fichaCuerpo').innerHTML = `<div class="ficha-cab">${avatar(p.sexo)}<div><h2><a href="#" data-editar title="Editar los datos del estudiante">${esc(nom(p))}</a> <span class="gtag g-${p.grupo.toLowerCase()}">${esc(p.grupo)}</span><a href="#" class="editar-lnk" data-editar>${editar ? 'Cerrar edición' : 'Editar estudiante'}</a></h2>
    <p class="guia" style="margin:0">${esc(p.codigo)} · ${esc(p.sexo)} · ${esc(p.edad)} años · registrado el ${esc(p.fecha_registro)}${p.observaciones ? ` · ${esc(p.observaciones)}` : ''}</p></div></div>
    <form class="editar ${editar ? '' : 'oculto'}" id="fichaEdit"><div class="fila">
      <div class="campo" style="max-width:110px"><label for="eCodigo">Código</label><input id="eCodigo" value="${esc(p.codigo)}" maxlength="8" style="text-transform:uppercase"></div>
      <div class="campo" style="flex:1.4"><label for="eNombre">Nombre</label><input id="eNombre" value="${esc(p.nombre)}"></div>
      <div class="campo" style="flex:1.4"><label for="eApellido">Apellido</label><input id="eApellido" value="${esc(p.apellido)}"></div>
      <div class="campo"><label for="eGrupo">Grupo</label><select id="eGrupo">${op(GRUPOS, p.grupo)}</select></div>
      <div class="campo"><label for="eSexo">Sexo</label><select id="eSexo">${op(['Femenino', 'Masculino'], p.sexo)}</select></div>
      <div class="campo" style="max-width:90px"><label for="eEdad">Edad</label><input id="eEdad" type="number" min="5" max="12" value="${esc(p.edad)}"></div></div>
      <div class="campo" style="margin-top:10px"><label for="eObs">Observaciones (opcional)</label><input id="eObs" value="${esc(p.observaciones || '')}" placeholder="Por ejemplo: repite el grado, usa gafas, se retiró en octubre"></div>
      <p class="guia" style="margin:10px 0;font-size:.88em">El código une todas sus aplicaciones y calificaciones, y lo siguen si lo cambia; no puede ser el de otro estudiante. Al cambiarlo cambia también el código de protocolo de sus aplicaciones.</p>
      <div class="fila"><button class="btn" type="submit" id="eGuardar">Guardar cambios</button><button class="btn sec" type="button" id="eCancelar">Cancelar</button></div><div id="eMsg" style="margin-top:10px"></div></form>
    <div class="pruebas">${fichaPrueba(codigo)}${fichaItems(codigo) || '<div class="prueba"><h3>Respuestas y puntaje de cada ítem</h3><p class="guia" style="margin:0;font-size:.9em">Cuando haya aplicaciones, aquí aparecen las respuestas y el puntaje de cada ítem.</p></div>'}</div>`;
  $('#ficha').classList.remove('oculto');
  $('#fichaCuerpo').querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); verEstudiante(codigo, !editar); if (!editar) $('#eNombre').focus(); }));
  $('#eCancelar').addEventListener('click', () => verEstudiante(codigo, false));
  $('#fichaEdit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevo = $('#eCodigo').value.trim().toUpperCase();
    const row = { ...p, codigo: nuevo, nombre: $('#eNombre').value.trim(), apellido: $('#eApellido').value.trim(), grupo: $('#eGrupo').value, sexo: $('#eSexo').value, edad: $('#eEdad').value, observaciones: $('#eObs').value.trim() };
    if (!row.codigo || !row.nombre || !row.apellido || !row.edad) return ($('#eMsg').innerHTML = '<div class="aviso mal">Código, nombre, apellido y edad son obligatorios.</div>');
    try { await api('participante', { method: 'PUT', body: { row, ...(nuevo !== p.codigo ? { anterior: p.codigo } : {}) } }); toast(nuevo !== p.codigo ? `Datos actualizados: ${p.codigo} pasa a ser ${nuevo}` : 'Datos actualizados'); await cargar(); verEstudiante(nuevo, false); ir(vista); } catch (err) { $('#eMsg').innerHTML = `<div class="aviso mal">${esc(err.message)}</div>`; }
  });
  $('#fichaCuerpo').querySelectorAll('[data-aplicar]').forEach((b) => b.addEventListener('click', () => irAplicar(b.dataset.c, b.dataset.m)));
  $('#fichaCuerpo').querySelectorAll('[data-cal]').forEach((b) => b.addEventListener('click', () => { $('#ficha').classList.add('oculto'); irCalificar(b.dataset.cal, b.dataset.m, b.dataset.e); }));
  $('#fichaCuerpo').querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
    const { c, m } = b.dataset;
    if (!(await dialogo({ titulo: 'Eliminar aplicación', texto: `Se elimina la prueba de ${c} ${nombreDe(c)} en ${m}, con sus calificaciones. Esta acción no se puede deshacer.`, ok: 'Eliminar', peligro: true }))) return;
    try { await api(`registro?codigo=${c}&momento=${m}`, { method: 'DELETE' }); toast('Aplicación eliminada'); await cargar(); verEstudiante(c); ir(vista); } catch (e) { toast(e.message, true); }
  }));
}
$('#fichaCerrar').addEventListener('click', () => $('#ficha').classList.add('oculto'));
$('#ficha').addEventListener('click', (e) => { if (e.target === $('#ficha')) $('#ficha').classList.add('oculto'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#ficha').classList.add('oculto'); $('#bitacora').classList.add('oculto'); } if (e.key === 'Enter' && e.target.matches('.estado[tabindex], label[for=archivoCopia]')) e.target.click(); });
document.addEventListener('click', (e) => { if (e.target.matches('[data-ficha]')) e.preventDefault(); });

/* ---------- aplicar ---------- */
let preApl = null;
const momA = seg('#aMom');
$('#aInsCorto').textContent = PC.corto; $('#aInsTec').textContent = `${PC.titulo} · ${PC.tecnico}`;
function irAplicar(codigo, momento) { preApl = { codigo, momento }; $('#ficha').classList.add('oculto'); origen = 'estudiantes'; ir('aplicar'); }
$('#ayudaBtn').addEventListener('click', () => { $('#ayudaPanel').innerHTML = guionHtml(); $('#ayudaPanel').classList.toggle('oculto'); });
function llenarSelEst(q = '') {
  const sel = $('#aCod'), prev = sel.value, ql = q.trim().toLowerCase();
  const lista = D.participantes.filter((p) => !ql || `${p.codigo} ${nom(p)}`.toLowerCase().includes(ql));
  sel.innerHTML = porGrupo(lista).map(([g, l]) => `<optgroup label="${g}">` + l.map((p) => `<option value="${esc(p.codigo)}">${esc(p.codigo)} · ${esc(nom(p))}</option>`).join('') + '</optgroup>').join('') || `<option value="">${ql ? '(sin coincidencias)' : '(registre estudiantes primero)'}</option>`;
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
}
$('#aBuscar').addEventListener('input', () => llenarSelEst($('#aBuscar').value));
async function verAplicar() {
  try { await cargar(); } catch (e) { toast(e.message, true); }
  $('#aBuscar').value = ''; llenarSelEst();
  const sel = $('#aCod');
  if (preApl) { sel.value = preApl.codigo; $('#aMom').querySelectorAll('button').forEach((b) => b.classList.toggle('activo', b.dataset.m === preApl.momento)); preApl = null; $('#aMsg').innerHTML = ''; }
  if (!$('#aApl').value) $('#aApl').value = localStorage.getItem('aplicador') || '';
  avisoAvance();
}
// aplicación sin terminar guardada en este dispositivo (por si se cerró el navegador o se agotó la batería)
function leerAvance() { try { const a = JSON.parse(localStorage.getItem('avance') || 'null'); return a && a.resp && D.participantes.some((p) => p.codigo === a.codigo) ? a : null; } catch { return null; } }
function avisoAvance() {
  const a = leerAvance(), el = $('#aAvance');
  if (!a) { el.classList.add('oculto'); el.innerHTML = ''; return; }
  const hechas = PUNTUABLES.filter((it) => respondido(it, a.resp) || a.estado[it.codigo]).length;
  el.innerHTML = `<div class="aviso nota" style="margin:0"><b>Aplicación sin terminar:</b> ${esc(a.codigo)} ${esc(nombreDe(a.codigo))}, ${esc(a.momento)} · ${hechas} de ${PUNTUABLES.length} ítems · ${esc(a.fecha)} <span class="fila" style="display:inline-flex;gap:8px;margin-left:10px"><button class="btn chico" id="btnContinuar">Continuar</button><button class="btn chico sec" id="btnDescartarAvance">Descartar</button></span></div>`;
  el.classList.remove('oculto');
  $('#btnContinuar').addEventListener('click', () => { const a = leerAvance(); if (a) startKid({ codigo: a.codigo, momento: a.momento, aplicador: a.aplicador }, a); });
  $('#btnDescartarAvance').addEventListener('click', async () => { if (await dialogo({ titulo: 'Descartar aplicación sin terminar', texto: 'Se borran las respuestas guardadas en este dispositivo.', ok: 'Descartar', peligro: true })) { localStorage.removeItem('avance'); avisoAvance(); } });
}
$('#btnStart').addEventListener('click', async () => {
  const codigo = $('#aCod').value, momento = momA(), apl = $('#aApl').value.trim(), m = $('#aMsg');
  if (!codigo) return (m.innerHTML = '<div class="aviso mal">Registre al estudiante antes de aplicar.</div>');
  if (!apl) return (m.innerHTML = '<div class="aviso mal">Escriba el nombre del aplicador.</div>');
  localStorage.setItem('aplicador', apl);
  const prev = reg(codigo, momento);
  if (prev && !(await dialogo({ titulo: 'Ya existe esta aplicación', texto: `${codigo} ${nombreDe(codigo)} ya tiene la prueba en ${momento} (${prev.fecha}). Si continúa, al guardar se reemplazará ese registro y se descartarán sus calificaciones.`, ok: 'Continuar y reemplazar', peligro: true }))) return;
  const a = leerAvance();
  if (a && a.codigo === codigo && a.momento === momento && (await dialogo({ titulo: 'Aplicación sin terminar', texto: 'Hay un avance guardado de esta misma aplicación en este dispositivo.', ok: 'Continuar donde iba', cancelar: 'Empezar de nuevo' }))) return startKid({ codigo, momento, aplicador: apl }, a);
  m.innerHTML = ''; startKid({ codigo, momento, aplicador: apl });
});

/* ---------- pantalla del niño ---------- */
let K = null;
// Orden de presentación de las situaciones: en el pretest, el del cuadernillo (1 a 6). En el postest, al azar y distinto
// para cada estudiante, por bloques (1-4 entre sí y 5-6 entre sí, con la pausa entre ambos), para que no repita de memoria el
// pretest; el primer bloque nunca queda en el orden del pretest. El orden interno de cada situación (hojas y preguntas) no
// cambia. Las respuestas se guardan por código de ítem, así que las columnas no cambian; el orden queda en el registro (orden).
function barajar(lista) { const a = lista.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const ORDEN_FIJO = PC.bloques.map((b) => b.situaciones);
function ordenSituaciones(momento) {
  if (momento !== 'Postest') return ORDEN_FIJO.flat();
  let out; do { out = ORDEN_FIJO.map(barajar); } while (out[0].join() === ORDEN_FIJO[0].join());
  return out.flat();
}
// Secuencia de pantallas, como las hojas del cuadernillo: instrucciones y práctica (no se guarda), y por cada situación sus
// etapas (hojas). Cada pantalla lleva el número de etapa (g); solo se puede volver atrás dentro de la misma etapa.
function secuencia(orden) {
  const seq = [{ tipo: 'inicio', g: 0 }]; let g = 0;
  PC.practica.items.forEach((it, i) => seq.push({ tipo: 'item', it, prac: true, sit: { titulo: PC.practica.titulo, texto: PC.practica.texto }, g: 0, pracN: i + 1 }));
  const sitDe = Object.fromEntries(PC.situaciones.map((s) => [s.id, s]));
  for (const b of PC.bloques) orden.filter((id) => b.situaciones.includes(id)).forEach((id, i) => {
    const sit = sitDe[id];
    sit.etapas.forEach((et, e) => {
      g++;
      if (e === 0 && i === 0 && b.pausa_antes) seq.push({ tipo: 'pausa', g });
      seq.push({ tipo: 'etapa', sit, et, e, g });
      for (const c of et.items) seq.push({ tipo: 'item', it: ITEM[c], sit, et, g });
    });
  });
  seq.push({ tipo: 'fin', g: g + 1 });
  let pos = 0; for (const x of seq) if (x.tipo === 'item' && !x.prac && !x.it.auxiliar) x.pos = ++pos; // posición en el orden presentado
  return seq;
}
function startKid(cfg, avance = null) {
  const orden = (avance && avance.orden) || ordenSituaciones(cfg.momento), seq = secuencia(orden);
  K = { ...cfg, orden, seq, i: avance ? Math.min(avance.i, seq.length - 2) : 0, resp: avance ? avance.resp : {}, estado: avance ? avance.estado || {} : {}, escriba: avance ? avance.escriba || {} : {}, pracResp: {}, escribaDef: localStorage.getItem('escriba') || 'nino', t0: avance ? Date.now() - (avance.transcurrido || 0) : Date.now(), terminada_antes: avance ? !!avance.terminada_antes : false };
  $('#kTag').innerHTML = `<b>${esc(PC.corto)}</b> · ${esc(cfg.codigo)} ${esc(nombreDe(cfg.codigo))} · ${esc(cfg.momento)}`;
  $('#kAyudaPanel').innerHTML = guionHtml(); $('#kAyudaPanel').classList.add('oculto');
  $('#kid').classList.remove('oculto'); $('#app').classList.add('oculto');
  renderKid();
}
const valorDe = (scr, k) => (scr.prac ? K.pracResp[k] : K.resp[k]);
function setValor(scr, k, v) { if (scr.prac) K.pracResp[k] = v; else K.resp[k] = v; guardarAvance(); actualizarNav(); }
function situacionHtml(scr) {
  const s = scr.sit, et = scr.et;
  let h = `<p class="eti">${scr.prac ? 'Práctica' : 'Situación ' + s.num}</p><h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p>`;
  if (s.dialogo) h += s.dialogo.map((d) => `<div class="dialogo-sit"><span class="quien">${esc(d.quien)}</span><span class="dice">—${esc(d.dice)}</span></div>`).join('');
  if (s.puntos) h += `<ul>${s.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;
  if (s.cierre) h += `<p>${esc(s.cierre)}</p>`;
  if (et && et.nueva_info) h += `<div class="nueva"><p class="eti">Información nueva</p><p>${esc(et.nueva_info.intro)}</p><ul>${et.nueva_info.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="cierre">${esc(et.nueva_info.cierre)}</p></div>`;
  return `<div class="k-sit">${h}</div>`;
}
const letraDe = (i) => String.fromCharCode(65 + i);
function parteHtml(scr, p) {
  const it = scr.it, k = it.codigo + p.id, v = valorDe(scr, k), bloq = !scr.prac && K.estado[it.codigo];
  let h = `<div class="k-parte" data-k="${k}">`;
  if (p.intro) h += `<p class="intro">${esc(p.intro)}</p>`;
  if (p.pregunta) h += `<p class="q">${esc(p.pregunta)}</p>`;
  if (p.etiqueta) h += `<p class="eti-chica">${esc(p.etiqueta)}</p>`;
  if (p.tipo === 'opcion') h += `<div class="opts ${p.compacto ? 'compacto fila-h' : ''}">${p.opciones.map((o, i) => `<button class="opt ${v === o.v ? 'sel' : ''}" data-opt="${k}" data-v="${esc(o.v)}" ${bloq ? 'disabled' : ''}>${p.letras ? `<span class="letra">${esc(o.v)}</span>` : '<span class="circ"></span>'}<span>${esc(o.t)}</span></button>`).join('')}</div>`;
  else if (p.tipo === 'multiple') h += `<div class="opts">${p.opciones.map((o) => `<button class="opt ${(v || []).includes(o.v) ? 'sel' : ''}" data-multi="${k}" data-v="${esc(o.v)}" ${bloq ? 'disabled' : ''}><span class="casilla">✓</span><span>${esc(o.t)}</span></button>`).join('')}</div><p class="cuenta" data-cuenta="${k}">${cuentaTxt(p, v)}</p>`;
  else if (p.tipo === 'union') h += `<ul class="leyenda">${p.opciones.map((o) => `<li><b>${esc(o.v)}</b><span>${esc(o.t)}</span></li>`).join('')}</ul><div class="union">${p.filas.map((f) => `<div class="fila-u"><span class="quien">${esc(f.nombre)}</span><span class="flecha">→</span><div class="letras">${p.opciones.map((o) => `<button class="${(v || {})[f.id] === o.v ? 'sel' : ''}" data-union="${k}" data-f="${f.id}" data-v="${esc(o.v)}" ${bloq ? 'disabled' : ''}>${esc(o.v)}</button>`).join('')}</div></div>`).join('')}</div>`;
  else if (p.tipo === 'texto') {
    const esc1 = (!scr.prac && K.escriba[k]) || K.escribaDef;
    h += `<div class="k-texto">${p.prefijo ? `<p class="pref">${esc(p.prefijo)}…</p>` : ''}<textarea data-texto="${k}" rows="${p.lineas || 2}" placeholder="Escribe aquí" ${bloq ? 'disabled' : ''}>${esc(v || '')}</textarea>` +
      (scr.prac ? '' : `<div class="escriba"><span>Escribe:</span><div class="seg"><button data-escriba="${k}" data-v="nino" class="${esc1 === 'nino' ? 'activo' : ''}">el niño o la niña</button><button data-escriba="${k}" data-v="aplicador" class="${esc1 === 'aplicador' ? 'activo' : ''}">el aplicador, al dictado</button></div></div>`) + '</div>';
  }
  return h + '</div>';
}
const cuentaTxt = (p, v) => { const n = (v || []).length; return `Has marcado ${n} de ${p.n}.`; };
// Un ítem que depende de otro (el 8 de la elección del 5; el 17 y el 19 de la elección inicial): si falta y la dependencia
// es estricta, el ítem queda como dato faltante (regla de la guía) y no se responde.
function dependencia(scr) {
  const it = scr.it, d = it.depende; if (!d || scr.prac) return null;
  const v = K.resp[d.item + d.parte], p = ITEM[d.item].partes.find((x) => x.id === d.parte);
  if (v && !K.estado[d.item]) return { ok: true, html: `<div class="k-dep"><span>${esc(d.texto)}</span><span>${esc(textoOpcion(p, v))}</span></div>` };
  return { ok: !!d.suave, html: `<div class="k-dep falta">${d.suave ? 'No quedó registrada la primera elección.' : 'No eligió en la pregunta anterior: este ítem queda como dato faltante y no se responde.'}</div>` };
}
function renderKid() {
  const scr = K.seq[K.i], body = $('#kBody');
  const hechos = PUNTUABLES.filter((it) => respondido(it, K.resp) || K.estado[it.codigo]).length;
  $('#kProg').style.width = (100 * hechos / PUNTUABLES.length) + '%';
  $('#kNav').classList.remove('oculto'); $('#kSinResp').classList.add('oculto'); $('#kFin').classList.toggle('oculto', scr.tipo === 'fin' || scr.g === 0);
  $('#kBack').disabled = K.i === 0 || K.seq[K.i - 1].g < scr.g; // atrás solo dentro de la misma hoja
  $('#kNext').textContent = 'Siguiente'; $('#kNext').disabled = false;
  body.className = 'kid-body' + (scr.tipo === 'item' ? '' : ' solo');
  if (scr.tipo === 'inicio') {
    $('#kCount').textContent = 'Inicio';
    body.innerHTML = `<div class="k-inter"><div class="caja"><p class="eti">${esc(PC.titulo)}</p><h3>Instrucciones</h3><p>${esc(PC.instrucciones)}</p><p class="nota centro">Primero hay una práctica corta que no se guarda.</p><div class="aplicador"><b>Aplicador:</b> lea las instrucciones en voz alta y compruebe que el niño o la niña entiende cómo marcar una opción y dónde escribir. ${esc(K.codigo)} ${esc(nombreDe(K.codigo))} · ${esc(K.momento)}.</div></div></div>`;
    $('#kNext').textContent = 'Empezar la práctica';
  } else if (scr.tipo === 'pausa') {
    $('#kCount').textContent = 'Pausa';
    body.innerHTML = `<div class="k-inter"><div class="caja"><p class="eti">Pausa breve</p><h3>Vamos a descansar un momento</h3><p class="centro">Después seguimos con las dos últimas historias: ${K.orden.slice(-2).map((id) => PC.situaciones.find((x) => x.id === id).titulo.toLowerCase()).join(' y ')}.</p><div class="aplicador"><b>Aplicador:</b> pausa breve antes de las situaciones 5 y 6. En ellas, la primera elección se cierra antes de mostrar la información nueva. Las respuestas anteriores ya quedaron cerradas.</div></div></div>`;
    $('#kNext').textContent = 'Continuar';
  } else if (scr.tipo === 'etapa') {
    const s = scr.sit, et = scr.et; $('#kCount').textContent = `Situación ${s.num}`;
    let h = `<p class="eti">Situación ${s.num}${scr.e ? ' · ' + esc(et.titulo) : ''}</p><h3>${esc(s.titulo)}</h3>`;
    if (!scr.e) h += `<p>${esc(s.texto)}</p>${s.dialogo ? s.dialogo.map((d) => `<p><span style="color:var(--tinta-2);font-size:.85em">${esc(d.quien)}</span><br><i>—${esc(d.dice)}</i></p>`).join('') : ''}${s.puntos ? `<ul style="text-align:left">${s.puntos.map((p) => `<li style="font-size:clamp(18px,1.35vw,23px);line-height:1.5">${esc(p)}</li>`).join('')}</ul>` : ''}${s.cierre ? `<p>${esc(s.cierre)}</p>` : ''}`;
    else if (et.nueva_info) h += `<div class="nueva"><p class="eti" style="margin-bottom:4px">Información nueva</p><p style="margin:0">${esc(et.nueva_info.intro)}</p><ul>${et.nueva_info.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div><p class="centro"><b>${esc(et.nueva_info.cierre)}</b></p>`;
    else h += `<p class="centro">Ahora vienen más preguntas sobre esta historia.</p>`;
    h += `<div class="aplicador"><b>Aplicador:</b> ${scr.e ? 'nueva hoja: las respuestas de la hoja anterior ya quedaron cerradas y no se pueden cambiar.' : 'lea la historia en voz alta, literalmente; luego pulse Continuar para ver las preguntas (la historia sigue visible al lado).'}${scr.e && !et.nueva_info ? ' Las opciones de esta parte podrían sugerir respuestas de la anterior; por eso no se vuelve atrás.' : ''}</div>`;
    body.innerHTML = `<div class="k-inter"><div class="caja">${h}</div></div>`;
    $('#kNext').textContent = scr.e ? 'Continuar' : 'Ver las preguntas';
  } else if (scr.tipo === 'item') {
    const it = scr.it, dep = dependencia(scr);
    if (dep && !dep.ok && !K.estado[it.codigo]) { K.estado[it.codigo] = 'faltante'; guardarAvance(); }
    const e = scr.prac ? null : K.estado[it.codigo];
    $('#kCount').textContent = scr.prac ? `Práctica ${scr.pracN} de ${PC.practica.items.length}` : it.num ? `Pregunta ${scr.pos} de ${PUNTUABLES.length}` : 'Elección inicial';
    const tag = e ? `<span class="om ${e === 'faltante' ? 'falt' : ''}">${e === 'omitido' ? 'Sin respuesta: omitió' : 'Sin oportunidad: dato faltante'}</span>` : '';
    body.innerHTML = situacionHtml(scr) + `<div class="k-preg"><p class="num"><span>${scr.prac ? 'Práctica (no se guarda)' : it.num ? `Ítem ${it.num}` : esc(it.etiqueta)}</span>${tag}</p>${dep ? dep.html : ''}${it.partes.map((p) => parteHtml(scr, p)).join('')}</div>`;
    $('#kSinResp').classList.toggle('oculto', !!scr.prac); $('#kSinResp').textContent = e ? 'Quitar la marca y responder' : 'Sin respuesta';
    if (K.i === K.seq.length - 2) $('#kNext').textContent = 'Terminar';
    actualizarNav();
    body.querySelector('.k-preg')?.scrollTo(0, 0);
  } else if (scr.tipo === 'fin') renderFin();
}
function itemListo(scr) { // hay algo que registrar: alguna parte respondida o el ítem marcado como sin respuesta
  const it = scr.it; if (!scr.prac && K.estado[it.codigo]) return true;
  return it.partes.some((p) => !vacio(valorDe(scr, it.codigo + p.id)));
}
function actualizarNav() { const scr = K.seq[K.i]; if (scr.tipo === 'item') $('#kNext').disabled = !itemListo(scr) && !scr.prac; }
$('#kBody').addEventListener('click', (e) => {
  const scr = K && K.seq[K.i]; if (!scr || scr.tipo !== 'item') return;
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.opt) { setValor(scr, b.dataset.opt, b.dataset.v); b.parentElement.querySelectorAll('.opt').forEach((x) => x.classList.toggle('sel', x === b)); }
  else if (b.dataset.multi) { const k = b.dataset.multi, p = scr.it.partes.find((x) => scr.it.codigo + x.id === k); let v = (valorDe(scr, k) || []).slice(); v = v.includes(b.dataset.v) ? v.filter((x) => x !== b.dataset.v) : p.opciones.map((o) => o.v).filter((x) => v.includes(x) || x === b.dataset.v); setValor(scr, k, v); b.classList.toggle('sel', v.includes(b.dataset.v)); $(`[data-cuenta="${k}"]`).textContent = cuentaTxt(p, v); }
  else if (b.dataset.union) { const k = b.dataset.union, v = { ...(valorDe(scr, k) || {}) }; v[b.dataset.f] = b.dataset.v; setValor(scr, k, v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); }
  else if (b.dataset.escriba) { K.escriba[b.dataset.escriba] = b.dataset.v; K.escribaDef = b.dataset.v; localStorage.setItem('escriba', b.dataset.v); guardarAvance(); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('activo', x === b)); }
});
$('#kBody').addEventListener('input', (e) => { const scr = K && K.seq[K.i]; if (!scr || scr.tipo !== 'item' || !e.target.dataset.texto) return; setValor(scr, e.target.dataset.texto, e.target.value); });
$('#kSinResp').addEventListener('click', async () => {
  const scr = K.seq[K.i], it = scr.it;
  if (K.estado[it.codigo]) { delete K.estado[it.codigo]; guardarAvance(); renderKid(); return; }
  const r = await dialogo({ titulo: 'Sin respuesta', texto: `${it.num ? 'Ítem ' + it.num : it.etiqueta}. ¿Por qué no hay respuesta?\n\n• Omitió: recibió la tarea, tuvo tiempo y no respondió, o contestó «no sé» o «porque sí». Se califica con 0 y queda registrada la omisión.\n• Sin oportunidad: interrupción, error o tiempo insuficiente. Queda como dato faltante y no suma.`, ok: 'Omitió (tuvo oportunidad)', otro: 'Sin oportunidad', cancelar: 'Cancelar' });
  if (!r) return;
  K.estado[it.codigo] = r === 'otro' ? 'faltante' : 'omitido'; guardarAvance(); renderKid();
});
$('#kNext').addEventListener('click', async () => {
  const scr = K.seq[K.i];
  if (scr.tipo === 'item' && !scr.prac && !K.estado[scr.it.codigo]) {
    const faltan = scr.it.partes.filter((p) => vacio(K.resp[scr.it.codigo + p.id]));
    if (faltan.length && !(await dialogo({ titulo: 'Partes sin responder', texto: `En este ítem falta: ${faltan.map((p) => p.pregunta || p.prefijo + '…').join(' / ')}. ¿Continuar y dejarlo así?`, ok: 'Continuar así', cancelar: 'Volver a la pregunta' }))) return;
  }
  if (K.i < K.seq.length - 1) { K.i++; guardarAvance(); renderKid(); }
});
$('#kBack').addEventListener('click', () => { if (K.i > 0 && !$('#kBack').disabled) { K.i--; guardarAvance(); renderKid(); } });
$('#kFin').addEventListener('click', async () => {
  const pend = ITEMS.filter((it) => !respondido(it, K.resp) && !K.estado[it.codigo]);
  if (!(await dialogo({ titulo: 'Terminar aquí', texto: `Se guarda lo respondido hasta ahora. ${pend.length ? `Los ${pend.length} ítems que faltan quedan como dato faltante (sin oportunidad), no como 0.` : 'No queda ningún ítem pendiente.'} Úselo cuando la aplicación se interrumpe y no puede continuar.`, ok: 'Terminar y revisar', cancelar: 'Seguir aplicando' }))) return;
  pend.forEach((it) => (K.estado[it.codigo] = 'faltante')); K.terminada_antes = true;
  K.i = K.seq.length - 1; guardarAvance(); renderKid();
});
function guardarAvance() { if (!K) return; localStorage.setItem('avance', JSON.stringify({ codigo: K.codigo, momento: K.momento, aplicador: K.aplicador, orden: K.orden, i: K.i, resp: K.resp, estado: K.estado, escriba: K.escriba, terminada_antes: K.terminada_antes, transcurrido: Date.now() - K.t0, fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) })); }
$('#kExit').addEventListener('click', async () => {
  const empezada = K && (Object.keys(K.resp).length > 0 || Object.keys(K.estado).length > 0) && K.seq[K.i].tipo !== 'fin';
  if (empezada && !(await dialogo({ titulo: 'Salir de la aplicación', texto: 'El avance queda guardado en este dispositivo y puede continuar después desde "Aplicar al estudiante". Si la aplicación no va a continuar, use "Terminar aquí" para guardarla con los ítems que faltan como dato faltante.', ok: 'Salir', cancelar: 'Seguir aquí' }))) return;
  if (!empezada) localStorage.removeItem('avance');
  cerrarKid();
});
$('#kAyudaBtn').addEventListener('click', () => $('#kAyudaPanel').classList.toggle('oculto'));
document.addEventListener('click', (e) => { // el guion se cierra al pulsar fuera de él
  for (const [panel, btn] of [['#ayudaPanel', '#ayudaBtn'], ['#kAyudaPanel', '#kAyudaBtn']]) if (!e.target.closest(panel) && !e.target.closest(btn)) $(panel).classList.add('oculto');
});
document.addEventListener('keydown', (e) => {
  if (!K || !$('#dialogo').classList.contains('oculto')) return;
  const enTexto = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
  if (!enTexto && /^[1-4]$/.test(e.key)) { const b = $('#kBody').querySelectorAll('.opts button')[Number(e.key) - 1]; if (b && !b.disabled) b.click(); }
  else if (e.key === 'Enter' && (!enTexto || e.ctrlKey) && !$('#kNext').disabled && !$('#kNav').classList.contains('oculto')) { e.preventDefault(); $('#kNext').click(); }
});
function cerrarKid(guardado) { K = null; $('#kid').classList.add('oculto'); $('#app').classList.remove('oculto'); if (guardado && origen === 'estudiantes') { origen = null; vista = 'estudiantes'; } recargar(); }
function renderFin() {
  const { codigo, momento, resp, estado } = K, dur = Math.round((Date.now() - K.t0) / 1000);
  const auto = autoPuntajes(resp, estado), cerr = PUNTUABLES.filter(esCerrado), autoN = cerr.filter((it) => auto[it.codigo] != null), suma = autoN.reduce((s, it) => s + auto[it.codigo], 0);
  const om = PUNTUABLES.filter((it) => estado[it.codigo] === 'omitido' || (!estado[it.codigo] && !respondido(it, resp))).map((it) => it.num), fa = PUNTUABLES.filter((it) => estado[it.codigo] === 'faltante').map((it) => it.num);
  const resps = PUNTUABLES.length - om.length - fa.length;
  $('#kProg').style.width = '100%'; $('#kCount').textContent = 'Fin'; $('#kNav').classList.add('oculto'); $('#kFin').classList.add('oculto');
  $('#kBody').innerHTML = `<div class="k-fin-grid"><div class="caja kid-fin"><h3>¡Muy bien, terminamos!</h3>
    <p style="color:var(--tinta-2);margin:0">Resumen para el aplicador: ${esc(codigo)} ${esc(nombreDe(codigo))}, ${esc(momento)}, ${fmtDur(dur)}.</p>
    <div class="res"><span>${resps} de ${PUNTUABLES.length} ítems respondidos</span>${om.length ? `<span class="om">Omitidos (0 puntos): ${om.join(', ')}</span>` : ''}${fa.length ? `<span class="falt">Sin oportunidad (dato faltante): ${fa.join(', ')}</span>` : ''}</div>
    <table><tr><td>Ítems cerrados calificados con la clave (${autoN.length} de ${cerr.length})</td><td>${suma} de ${autoN.length * 2}</td></tr><tr><td>Ítems de rúbrica pendientes de calificar en el módulo Calificar</td><td>${RUBRICA.filter((it) => estado[it.codigo] !== 'faltante' && estado[it.codigo] !== 'omitido' && respondido(it, resp)).length}</td></tr></table>
    <div class="campo"><label for="kObs">Observaciones e incidencias (opcional)</label><textarea id="kObs" rows="2" placeholder="Por ejemplo: se le volvió a leer la situación 3; pausa de 5 minutos; apoyo para escribir en los ítems 10 y 15"></textarea></div>
    <div class="fila" style="margin-top:12px"><button class="btn grande" id="kSave">Guardar</button><button class="btn sec grande" id="kDiscard">Descartar</button></div><div id="kMsg" style="margin-top:10px"></div></div></div>`;
  $('#kSave').addEventListener('click', async () => {
    $('#kSave').disabled = true;
    const cuerpo = { row: { codigo, momento, aplicador: K.aplicador, duracion_seg: dur, respuestas: resp, estado, escriba: K.escriba, ...(K.momento === 'Postest' ? { orden: K.orden } : {}), terminada_antes: K.terminada_antes, observaciones: $('#kObs').value.trim() } };
    try { await api('registro', { method: 'PUT', body: cuerpo }); localStorage.removeItem('avance'); toast('Guardado'); cerrarKid(true); }
    catch (e) {
      if (e.status && e.status < 500) { $('#kMsg').innerHTML = `<div class="aviso mal">No se pudo guardar: ${esc(e.message)}.</div>`; $('#kSave').disabled = false; return; }
      // sin conexión (o falla del servidor): queda en este dispositivo y se envía cuando vuelva la conexión
      encolar({ ...cuerpo, fecha: new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) }); localStorage.removeItem('avance');
      toast('Sin conexión: la aplicación quedó guardada en este dispositivo y se enviará cuando vuelva la conexión'); cerrarKid(true);
    }
  });
  $('#kDiscard').addEventListener('click', async () => { if (await dialogo({ titulo: 'Descartar aplicación', texto: 'Se descartan las respuestas de esta aplicación sin guardarlas.', ok: 'Descartar', peligro: true })) { localStorage.removeItem('avance'); cerrarKid(); } });
}
/* ---------- cola de envío sin conexión ---------- */
const leerCola = () => { try { return JSON.parse(localStorage.getItem('colaEnvio') || '[]'); } catch { return []; } };
function encolar(x) { const c = leerCola(); c.push(x); localStorage.setItem('colaEnvio', JSON.stringify(c)); pintarCola(); }
function pintarCola() {
  const c = leerCola(), el = $('#pendientes');
  el.classList.toggle('oculto', !c.length);
  if (c.length) el.innerHTML = `<span><b>${c.length} aplicación${c.length > 1 ? 'es' : ''} pendiente${c.length > 1 ? 's' : ''} de enviar</b> (guardada${c.length > 1 ? 's' : ''} en este dispositivo): ${c.map((x) => `${esc(x.row.codigo)} ${esc(x.row.momento)}`).join('; ')}.</span><button class="btn chico" id="btnEnviarCola">Enviar ahora</button>`;
  $('#btnEnviarCola')?.addEventListener('click', () => enviarCola(true));
}
let enviando = false;
async function enviarCola(avisar = false) {
  if (enviando || !D) return; const c = leerCola(); if (!c.length) return; enviando = true;
  const quedan = []; let ok = 0;
  for (const x of c) { try { await api('registro', { method: 'PUT', body: { row: x.row } }); ok++; } catch (e) { if (e.status && e.status < 500) { toast(`No se aceptó ${x.row.codigo} ${x.row.momento}: ${e.message}`, true); ok++; } else quedan.push(x); } }
  localStorage.setItem('colaEnvio', JSON.stringify(quedan)); enviando = false; pintarCola();
  if (ok) { toast(`${ok} aplicación${ok > 1 ? 'es' : ''} enviada${ok > 1 ? 's' : ''}`); await recargar(); } else if (avisar) toast('Todavía no hay conexión con el servidor', true);
}
window.addEventListener('online', () => enviarCola());
setInterval(() => { if (leerCola().length) enviarCola(); }, 60000);

/* ---------- calificar ---------- */
let calVista = 'lista', calRol = localStorage.getItem('calRol') || '1', calSel = null, calFiltro = localStorage.getItem('calFiltro') || 'pendientes', calPiloto = true;
const nombreCal = (rol) => localStorage.getItem('calNombre' + rol) || '';
function irCalificar(codigo, momento, e) { calSel = { codigo, momento }; calRol = e === 'completa' || e === 'doble' ? 'F' : (cal(codigo, momento)['1']?.completa ? '2' : '1'); localStorage.setItem('calRol', calRol); calVista = 'protocolo'; $('#ficha').classList.add('oculto'); origen = 'estudiantes'; ir('calificar'); }
const protocolos = () => D.pc.slice().sort((a, b) => (a.protocolo || '').localeCompare(b.protocolo || '')); // orden por código de protocolo: mezcla grupos y momentos
const nRub = (r) => RUBRICA.filter((it) => !r.estado?.[it.codigo]).length; // ítems de rúbrica que requieren puntuación humana (los omitidos valen 0 por regla; los faltantes no se puntúan)
const hechos = (r, c) => (c ? RUBRICA.filter((it) => !r.estado?.[it.codigo] && Number.isInteger(c.puntos?.[it.codigo])).length : 0);
const notaEstados = (r) => { const om = RUBRICA.filter((it) => r.estado?.[it.codigo] === 'omitido').length, fa = RUBRICA.filter((it) => r.estado?.[it.codigo] === 'faltante').length; const t = [om ? `${om} omitido${om > 1 ? 's' : ''} (0 por regla)` : '', fa ? `${fa} sin oportunidad` : ''].filter(Boolean).join(', '); return t ? ` <small title="Ítems de rúbrica que no requieren puntuación">(${t})</small>` : ''; };
async function verCalificar() {
  try { await cargar(); } catch (e) { toast(e.message, true); }
  if (calVista === 'protocolo' && calSel && reg(calSel.codigo, calSel.momento)) return (calRol === 'F' ? verAcuerdo() : verProtocolo());
  calVista = 'lista'; verListaCal();
}
function barraCal() {
  const A = estadisticasAcuerdo(D, calPiloto ? null : (r) => D.participantes.find((p) => p.codigo === r.codigo)?.grupo !== 'Piloto');
  const n = D.pc.length, porRol = (rol) => D.pc.filter((r) => cal(r.codigo, r.momento)[rol]?.completa).length, acordados = D.pc.filter((r) => estadoCalif(cal(r.codigo, r.momento)) === 'completa').length;
  $('#resumenC').textContent = n ? `${n} protocolo${n > 1 ? 's' : ''} · calificador 1: ${porRol('1')} · calificador 2: ${porRol('2')} · acordados: ${acordados}` : '';
  return `<div class="cal-barra"><div class="campo" style="flex:0 0 auto"><label>Quién califica</label><div class="seg" id="cRol">${[['1', 'Calificador 1'], ['2', 'Calificador 2'], ['F', 'Acuerdo']].map(([r, t]) => `<button data-m="${r}" class="${calRol === r ? 'activo' : ''}">${t}</button>`).join('')}</div></div>` +
    (calRol !== 'F' ? `<div class="campo" style="max-width:260px"><label for="cNombre">Nombre del calificador ${calRol}</label><input id="cNombre" value="${esc(nombreCal(calRol))}" placeholder="Nombre"></div>` : '') +
    `<div class="campo" style="flex:0 0 auto"><label>Mostrar</label><div class="seg" id="cFiltro"><button data-m="pendientes" class="${calFiltro === 'pendientes' ? 'activo' : ''}">Pendientes</button><button data-m="todos" class="${calFiltro === 'todos' ? 'activo' : ''}">Todos</button></div></div></div>` +
    `<div class="cal-stats"><span class="chip" title="Protocolos con los dos calificadores completos"><b>${A.total.n ? D.pc.filter((r) => { const c = cal(r.codigo, r.momento); return c['1']?.completa && c['2']?.completa; }).length : 0}</b> con doble calificación</span><span class="chip" title="Porcentaje de ítems de rúbrica en los que los dos calificadores dieron el mismo puntaje"><b>${fmtPct(A.total.pct)}</b> acuerdo exacto</span><span class="chip" title="Kappa ponderado con pesos lineales sobre todos los ítems de rúbrica con doble calificación"><b>${fmtK(A.total.kappa)}</b> kappa ponderado (${A.total.n} pares)</span><label class="check" for="cPiloto" title="Incluir en las estadísticas de acuerdo los protocolos del grupo Piloto"><input type="checkbox" id="cPiloto" ${calPiloto ? 'checked' : ''}> incluir Piloto</label></div>`;
}
function activarBarraCal(onChange) {
  $('#cRol').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { calRol = b.dataset.m; localStorage.setItem('calRol', calRol); onChange(); }));
  $('#cFiltro').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { calFiltro = b.dataset.m; localStorage.setItem('calFiltro', calFiltro); onChange(); }));
  $('#cNombre')?.addEventListener('input', () => localStorage.setItem('calNombre' + calRol, $('#cNombre').value.trim()));
  $('#cPiloto').addEventListener('change', () => { calPiloto = $('#cPiloto').checked; onChange(); });
}
function verListaCal() {
  calVista = 'lista';
  const L = protocolos(), est = (r, rol) => { const c = cal(r.codigo, r.momento)[rol]; if (!c) return ['nada', 'Sin calificar']; return c.completa ? ['ok', 'Completa ✓'] : ['medio', `En proceso (${hechos(r, c)} de ${nRub(r)})`]; };
  let filas;
  if (calRol !== 'F') {
    const lista = L.filter((r) => calFiltro === 'todos' || !cal(r.codigo, r.momento)[calRol]?.completa);
    filas = lista.map((r) => { const [cl, t] = est(r, calRol); return `<tr><td><b>${esc(r.protocolo)}</b></td><td>${esc(r.fecha)}</td><td class="cen">${nRub(r)}${notaEstados(r)}</td><td><span class="pto ${cl}">${t}</span></td><td><button class="btn chico ${cl === 'ok' ? 'sec' : ''}" data-prot="${esc(r.codigo)}" data-m="${esc(r.momento)}">${cl === 'ok' ? 'Revisar' : cl === 'medio' ? 'Continuar' : 'Calificar'}</button></td></tr>`; });
    $('#calCuerpo').innerHTML = barraCal() + (filas.length ? `<table class="datos"><thead><tr><th>Protocolo</th><th>Aplicado</th><th class="cen">Ítems de rúbrica</th><th>Mi calificación</th><th></th></tr></thead><tbody>${filas.join('')}</tbody></table>` : `<p class="cal-vacio">${L.length ? 'No hay protocolos pendientes para este calificador.' : 'Aún no hay aplicaciones guardadas.'}</p>`);
  } else {
    const lista = L.filter((r) => calFiltro === 'todos' || !cal(r.codigo, r.momento).F?.completa);
    filas = lista.map((r) => { const c = cal(r.codigo, r.momento), listo = c['1']?.completa && c['2']?.completa; const dif = listo ? RUBRICA.filter((it) => r.estado?.[it.codigo] !== 'faltante' && c['1'].puntos[it.codigo] !== c['2'].puntos[it.codigo]).length : null;
      const f = c.F?.completa ? '<span class="pto ok">Acordada ✓</span>' : c.F ? '<span class="pto medio">En proceso</span>' : listo ? '<span class="pto medio">Pendiente</span>' : '<span class="pto nada">Faltan calificaciones</span>';
      return `<tr><td><b>${esc(r.protocolo)}</b></td><td><span class="pto ${est(r, '1')[0]}">${est(r, '1')[1]}</span></td><td><span class="pto ${est(r, '2')[0]}">${est(r, '2')[1]}</span></td><td class="cen">${dif == null ? '–' : dif ? `<span class="pto medio">${dif}</span>` : '<span class="pto ok">0</span>'}</td><td>${f}</td><td>${listo ? `<button class="btn chico ${c.F?.completa ? 'sec' : ''}" data-prot="${esc(r.codigo)}" data-m="${esc(r.momento)}">${c.F?.completa ? 'Revisar' : 'Acordar'}</button>` : ''}</td></tr>`; });
    const A = estadisticasAcuerdo(D, calPiloto ? null : (r) => D.participantes.find((p) => p.codigo === r.codigo)?.grupo !== 'Piloto');
    const tabA = `<details class="papelera" style="margin-top:18px"><summary>Acuerdo entre calificadores por ítem</summary><table class="datos" style="margin-top:10px"><thead><tr><th>Ítem</th><th>Habilidad</th><th class="cen">Protocolos</th><th class="cen">Acuerdo exacto</th><th class="cen">Kappa ponderado</th></tr></thead><tbody>${A.items.map((x) => `<tr><td><b>${x.num}</b></td><td>${esc(x.hab)}</td><td class="cen">${x.n}</td><td class="cen">${fmtPct(x.pct)}</td><td class="cen">${fmtK(x.kappa)}</td></tr>`).join('')}<tr><td><b>Todos</b></td><td></td><td class="cen">${A.total.n}</td><td class="cen">${fmtPct(A.total.pct)}</td><td class="cen">${fmtK(A.total.kappa)}</td></tr></tbody></table><p class="guia" style="margin:8px 0 0;font-size:.86em">Kappa ponderado con pesos lineales (distingue desacuerdos de uno y de dos puntos). Queda vacío cuando no hay variación suficiente para calcularlo; en ese caso se informa solo el acuerdo observado.</p></details>`;
    $('#calCuerpo').innerHTML = barraCal() + (filas.length ? `<table class="datos"><thead><tr><th>Protocolo</th><th>Calificador 1</th><th>Calificador 2</th><th class="cen">Discrepancias</th><th>Puntuación final</th><th></th></tr></thead><tbody>${filas.join('')}</tbody></table>` : `<p class="cal-vacio">${L.length ? 'No hay protocolos pendientes de acuerdo.' : 'Aún no hay aplicaciones guardadas.'}</p>`) + (A.total.n ? tabA : '');
  }
  activarBarraCal(verListaCal);
  $('#calCuerpo').querySelectorAll('[data-prot]').forEach((b) => b.addEventListener('click', () => { calSel = { codigo: b.dataset.prot, momento: b.dataset.m }; calVista = 'protocolo'; if (calRol === 'F') verAcuerdo(); else verProtocolo(); }));
}
// Respuesta del estudiante a un ítem, parte por parte, con la ayuda de la clave (uniones correctas, informaciones pertinentes).
function respuestaHtml(r, it) {
  const ayuda = it.puntuacion.ayuda, apl = (k) => (r.escriba?.[k] === 'aplicador' ? '<span class="apl">(escribió el aplicador)</span>' : '');
  const partes = it.partes.map((p) => {
    const k = it.codigo + p.id, v = r.respuestas[k]; let h = `<div class="p"><span class="q">${esc(p.pregunta || p.etiqueta || (p.prefijo ? p.prefijo + '…' : ''))}</span>`;
    if (vacio(v)) return h + '<span class="nada">sin respuesta</span></div>';
    if (p.tipo === 'opcion') h += `<span class="v">${p.letras ? `<span class="letra">${esc(v)}</span>` : ''}${esc(textoOpcion(p, v))}</span>`;
    else if (p.tipo === 'multiple') h += `<span class="v">${v.map((x) => { const ok = ayuda && ayuda.tipo === 'pertinentes' && ayuda.parte === p.id ? (ayuda.valores.includes(x) ? ' <span class="ok">pertinente</span>' : ' <span class="mal">no pertinente</span>') : ''; return `<span class="letra">${esc(x)}</span>${esc(textoOpcion(p, x))}${ok}`; }).join('<br>')}</span>`;
    else if (p.tipo === 'union') h += `<span class="v">${p.filas.map((f) => { const x = v[f.id]; const ok = ayuda && ayuda.tipo === 'uniones' && ayuda.parte === p.id ? (x === ayuda.correctas[f.id] ? ' <span class="ok">✓</span>' : ` <span class="mal">✗ (correcta: ${ayuda.correctas[f.id]})</span>`) : ''; return `${esc(f.nombre)} → ${x ? `<span class="letra">${esc(x)}</span>${esc(textoOpcion(p, x))}` : '<span class="nada">sin unir</span>'}${x ? ok : ''}`; }).join('<br>')}</span>`;
    else if (p.tipo === 'texto') h += `<span class="v txt">${p.prefijo ? `<i style="color:var(--tinta-2)">${esc(p.prefijo)}</i> ` : ''}${esc(v)}${p.sufijo || ''}</span>${apl(k)}`;
    return h + '</div>';
  });
  if (it.depende) { const d = it.depende, pd = ITEM[d.item].partes.find((x) => x.id === d.parte), v = r.respuestas[d.item + d.parte]; partes.unshift(`<div class="p"><span class="q">${esc(d.texto)}</span><span class="v">${v ? esc(textoOpcion(pd, v)) : '<span class="nada">sin registro</span>'}</span></div>`); }
  if (it.final) { const f = eleccionFinal(r, it), pd = ITEM[it.final.inicial.item].partes.find((x) => x.id === it.final.inicial.parte); partes.push(`<div class="p"><span class="q">Elección final (según su decisión)</span><span class="v">${f ? esc(textoOpcion(pd, f)) : '<span class="nada">no se puede derivar</span>'}</span></div>`); }
  return `<div class="resp">${partes.join('')}</div>`;
}
function cabItem(r, it, extra = '') {
  const e = r.estado?.[it.codigo], tag = e === 'omitido' ? '<span class="tag om">Omitió · 0 por regla</span>' : e === 'faltante' ? '<span class="tag">Sin oportunidad · dato faltante</span>' : extra;
  return `<div class="cab"><b>Ítem ${it.num}</b><span>${esc(HAB[it.habilidad].corto)} · ${esc(it.sub)}</span>${tag}</div>`;
}
function itemCerradoHtml(r, it) {
  const a = r.auto?.[it.codigo], e = r.estado?.[it.codigo];
  const tag = e === 'faltante' ? '' : a === 2 ? '<span class="tag ok">Correcta · 2 puntos (automático)</span>' : '<span class="tag mal">Incorrecta · 0 puntos (automático)</span>';
  return `<div class="cal-item cerrado">${cabItem(r, it, tag)}${respuestaHtml(r, it)}</div>`;
}
function verProtocolo() {
  const r = reg(calSel.codigo, calSel.momento), rol = calRol, C = cal(calSel.codigo, calSel.momento)[rol], puntos = { ...(C?.puntos || {}) };
  const itemHtml = (it) => {
    if (esCerrado(it)) return itemCerradoHtml(r, it);
    const e = r.estado?.[it.codigo], pu = it.puntuacion;
    const der = e ? `<div class="rubrica"><div class="fijo">${e === 'omitido' ? 'Omisión con oportunidad: se califica con 0 por regla.' : 'Sin oportunidad de respuesta: dato faltante, no se puntúa.'}</div></div>`
      : `<div class="rubrica">${[2, 1, 0].map((n) => `<button data-pt="${it.codigo}" data-v="${n}" class="${puntos[it.codigo] === n ? 'sel' : ''}"><b>${n}</b><span>${esc(pu.niveles[n])}</span></button>`).join('')}${pu.nota ? `<p class="nota">${esc(pu.nota)}</p>` : ''}</div>`;
    return `<div class="cal-item" data-item="${it.codigo}">${cabItem(r, it)}${respuestaHtml(r, it)}${der}</div>`;
  };
  const pinta = () => { const h = hechos(r, { puntos }), n = nRub(r); $('#cAvance').innerHTML = `<span>${h} de ${n} ítems puntuados</span><div class="barra"><i style="width:${n ? 100 * h / n : 0}%"></i></div>`; };
  $('#calCuerpo').innerHTML = `<div class="cal-prot"><div><h3>Protocolo ${esc(r.protocolo)}</h3><span class="sub">Calificador ${rol}${nombreCal(rol) ? ': ' + esc(nombreCal(rol)) : ''} · aplicado el ${esc(r.fecha)}${C ? ' · calificación guardada el ' + esc(C.fecha) : ''}</span></div><div class="avance" id="cAvance"></div><button class="lnk chico" id="cVolver">← Volver a la lista</button></div>` +
    `<p class="guia">Lea la respuesta del estudiante y elija el nivel de la rúbrica (2, 1 o 0). Los ítems cerrados ya están calificados con la clave. Puede guardar a medias y continuar después.</p>` +
    PUNTUABLES.map(itemHtml).join('') +
    `<div class="cal-pie"><div class="campo" style="max-width:240px"><label for="cNombre2">Nombre del calificador ${rol}</label><input id="cNombre2" value="${esc(nombreCal(rol))}" placeholder="Nombre"></div><div class="campo"><label for="cObs">Observaciones (opcional)</label><input id="cObs" value="${esc(C?.observaciones || '')}"></div><button class="btn grande" id="cGuardar">Guardar calificación</button><div class="msg" id="cMsg"></div></div>`;
  pinta(); window.scrollTo(0, 0);
  $('#cVolver').addEventListener('click', verListaCal);
  $('#cNombre2').addEventListener('input', () => localStorage.setItem('calNombre' + rol, $('#cNombre2').value.trim()));
  $('#calCuerpo').querySelectorAll('[data-pt]').forEach((b) => b.addEventListener('click', () => { puntos[b.dataset.pt] = Number(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); pinta(); }));
  $('#cGuardar').addEventListener('click', async () => {
    const nombre = $('#cNombre2').value.trim(); if (!nombre) return ($('#cMsg').innerHTML = '<div class="aviso mal" style="margin:0">Escriba el nombre del calificador.</div>');
    const pend = nRub(r) - hechos(r, { puntos });
    if (pend && !(await dialogo({ titulo: 'Calificación incompleta', texto: `Faltan ${pend} ítem(s) por puntuar. Se guarda como "en proceso" y puede continuar después.`, ok: 'Guardar así', cancelar: 'Seguir calificando' }))) return;
    $('#cGuardar').disabled = true;
    try { await api('calificacion', { method: 'PUT', body: { codigo: calSel.codigo, momento: calSel.momento, rol, calificador: nombre, puntos, observaciones: $('#cObs').value.trim() } }); toast(pend ? 'Calificación guardada (en proceso)' : 'Calificación guardada'); await cargar(); verListaCal(); }
    catch (e) { $('#cMsg').innerHTML = `<div class="aviso mal" style="margin:0">${esc(e.message)}</div>`; $('#cGuardar').disabled = false; }
  });
}
function verAcuerdo() {
  const r = reg(calSel.codigo, calSel.momento), C = cal(calSel.codigo, calSel.momento), c1 = C['1'], c2 = C['2'];
  if (!(c1?.completa && c2?.completa)) { toast('Para acordar hacen falta las dos calificaciones completas', true); return verListaCal(); }
  const puntos = { ...(C.F?.puntos || {}) };
  for (const it of RUBRICA) if (puntos[it.codigo] == null && c1.puntos[it.codigo] != null && c1.puntos[it.codigo] === c2.puntos[it.codigo]) puntos[it.codigo] = c1.puntos[it.codigo]; // coincidencias: final prellenada
  const difs = RUBRICA.filter((it) => r.estado?.[it.codigo] !== 'faltante' && c1.puntos[it.codigo] !== c2.puntos[it.codigo]);
  const itemHtml = (it) => {
    if (esCerrado(it)) return itemCerradoHtml(r, it);
    const e = r.estado?.[it.codigo], dif = difs.includes(it), pu = it.puntuacion;
    const der = e === 'faltante' ? '<div class="rubrica"><div class="fijo">Sin oportunidad de respuesta: dato faltante, no se puntúa.</div></div>'
      : `<div><div class="acu"><div class="col"><small>Calificador 1</small><b>${c1.puntos[it.codigo] ?? '–'}</b></div><div class="col ${dif ? 'dif' : ''}"><small>Calificador 2</small><b>${c2.puntos[it.codigo] ?? '–'}</b></div><div class="col"><small>Final acordada</small>${e === 'omitido' ? '<b>0</b>' : `<div class="final">${[2, 1, 0].map((n) => `<button data-pt="${it.codigo}" data-v="${n}" class="${puntos[it.codigo] === n ? 'sel' : ''}">${n}</button>`).join('')}</div>`}</div></div>` +
        `<details style="margin-top:8px;font-size:.86em;color:var(--tinta-2)"><summary style="cursor:pointer">Rúbrica</summary>${[2, 1, 0].map((n) => `<p style="margin:6px 0 0"><b>${n}:</b> ${esc(pu.niveles[n])}</p>`).join('')}${pu.nota ? `<p style="margin:6px 0 0"><i>${esc(pu.nota)}</i></p>` : ''}</details></div>`;
    return `<div class="cal-item ${dif ? 'dif' : ''}">${cabItem(r, it, dif ? '<span class="tag mal">Discrepancia</span>' : '<span class="tag ok">Coinciden</span>')}${respuestaHtml(r, it)}${der}</div>`;
  };
  const pinta = () => { const h = hechos(r, { puntos }), n = nRub(r); $('#cAvance').innerHTML = `<span>${h} de ${n} finales fijadas</span><div class="barra"><i style="width:${n ? 100 * h / n : 0}%"></i></div>`; };
  $('#calCuerpo').innerHTML = `<div class="cal-prot"><div><h3>Acuerdo · protocolo ${esc(r.protocolo)}</h3><span class="sub">Calificador 1: ${esc(c1.calificador)} · Calificador 2: ${esc(c2.calificador)} · ${difs.length} discrepancia${difs.length === 1 ? '' : 's'} en ${nRub(r)} ítems${C.F?.completa ? ' · acordada el ' + esc(C.F.fecha) : ''}</span></div><div class="avance" id="cAvance"></div><button class="lnk chico" id="cVolver">← Volver a la lista</button></div>` +
    `<p class="guia">Las coincidencias quedan prellenadas como puntuación final. En las discrepancias (resaltadas), revisen juntos la rúbrica y fijen la final; si el desacuerdo persiste, decide un tercer evaluador. La puntuación final es la que entra en las sumas y en el Excel.</p>` +
    PUNTUABLES.map(itemHtml).join('') +
    `<div class="cal-pie"><div class="campo"><label for="cObs">Observaciones del acuerdo (opcional)</label><input id="cObs" value="${esc(C.F?.observaciones || '')}" placeholder="Por ejemplo: ítem 10 resuelto por un tercer evaluador"></div><button class="btn grande" id="cGuardar">Guardar puntuación final</button><div class="msg" id="cMsg"></div></div>`;
  pinta(); window.scrollTo(0, 0);
  $('#cVolver').addEventListener('click', verListaCal);
  $('#calCuerpo').querySelectorAll('[data-pt]').forEach((b) => b.addEventListener('click', () => { puntos[b.dataset.pt] = Number(b.dataset.v); b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); pinta(); }));
  $('#cGuardar').addEventListener('click', async () => {
    const pend = nRub(r) - hechos(r, { puntos });
    if (pend && !(await dialogo({ titulo: 'Acuerdo incompleto', texto: `Faltan ${pend} ítem(s) por fijar. Se guarda como "en proceso"; las sumas aparecen cuando la puntuación final esté completa.`, ok: 'Guardar así', cancelar: 'Seguir' }))) return;
    $('#cGuardar').disabled = true;
    try { await api('calificacion', { method: 'PUT', body: { codigo: calSel.codigo, momento: calSel.momento, rol: 'F', calificador: [c1.calificador, c2.calificador].join(' y '), puntos, observaciones: $('#cObs').value.trim() } }); toast(pend ? 'Puntuación final guardada (en proceso)' : 'Puntuación final guardada'); await cargar(); verListaCal(); }
    catch (e) { $('#cMsg').innerHTML = `<div class="aviso mal" style="margin:0">${esc(e.message)}</div>`; $('#cGuardar').disabled = false; }
  });
}

/* ---------- tabla de respuestas (formato panel) ---------- */
let verR = 'hab';
seg('#rVer', (m) => { verR = m; verRespuestas(); });
$('#rCalif').addEventListener('change', verRespuestas); $('#rMeta').addEventListener('change', verRespuestas);
const BLOQUES = { meta: ['Aplicación', 'meta'], hab: ['Habilidades', 'hab'], item: ['Puntaje final por ítem', 'item'], calif: ['Cada calificador', 'calif'], resp: ['Respuestas', 'resp'] };
function verRespuestas() {
  const cols = columnasRespuestas({ meta: $('#rMeta').checked, calif: $('#rCalif').checked && verR !== 'hab', items: verR !== 'hab', resp: verR === 'todo' });
  const ps = D.participantes, lista = ps.filter((p) => p.grupo === grupoActivo).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const completo = (p) => MOMENTOS.every((m) => { const r = reg(p.codigo, m); return r && sumas(r, cal(p.codigo, m).F).total != null; });
  $('#resumenR').textContent = ps.length ? `${ps.filter(completo).length} de ${ps.length} completos` : ''; $('#resumenR').title = 'Estudiantes con pretest y postest aplicados y con puntuación final completa en ambos';
  const bloques = Object.keys(BLOQUES).map((b) => ({ b, cols: cols.filter((c) => c.bloque === b) })).filter((x) => x.cols.length);
  const celda = (c, v, i) => { const t = c.bloque === 'hab' ? 'dim' : c.bloque === 'resp' && typeof v === 'string' && v.length > 22 ? 'txt' : 'num'; return `<td class="${t} ${i === 0 ? 'ini' : ''}" ${t === 'txt' ? `title="${esc(v)}"` : ''}>${v === '' && c.bloque === 'hab' ? '<span class="pend" title="Falta la puntuación acordada o hay ítems sin oportunidad">–</span>' : esc(v)}</td>`; };
  const celdas = (x, p, m) => { const r = reg(p.codigo, m); if (!r) return `<td colspan="${x.cols.length}" class="vacio ini"><span>Sin aplicar</span></td>`; const C = cal(p.codigo, m); return x.cols.map((c, i) => celda(c, c.valor(r, C), i)).join(''); };
  const filaEst = (p) => `<tr class="pre"><td rowspan="2" class="fijo r-cod"><b>${esc(p.codigo)}</b></td><td rowspan="2" class="fijo r-nom"><a href="#" data-ficha="${esc(p.codigo)}">${esc(nom(p))}</a></td><td class="fijo r-mom mom">Pretest</td><td rowspan="2" class="izq">${esc(p.sexo === 'Femenino' ? 'F' : p.sexo === 'Masculino' ? 'M' : '')}</td><td rowspan="2" class="izq">${esc(p.edad)}</td>${bloques.map((x) => celdas(x, p, 'Pretest')).join('')}</tr>
    <tr class="post"><td class="fijo r-mom mom">Postest</td>${bloques.map((x) => celdas(x, p, 'Postest')).join('')}</tr>`;
  $('#tablaR').innerHTML = tabsGrupo(ps, (l) => l.length) + (lista.length ? `<div class="tabla-r"><table class="resp-ancha"><thead>
    <tr><th rowspan="2" class="fijo r-cod">Código</th><th rowspan="2" class="fijo r-nom">Nombre</th><th rowspan="2" class="fijo r-mom">Momento</th><th rowspan="2">Sexo</th><th rowspan="2">Edad</th>${bloques.map((x) => `<th colspan="${x.cols.length}" class="p-${BLOQUES[x.b][1]} ini r1"><span>${esc(BLOQUES[x.b][0])}</span></th>`).join('')}</tr>
    <tr>${bloques.map((x) => x.cols.map((c, i) => `<th class="r2 ${c.bloque === 'hab' ? 'dim' : ''} ${i === 0 ? 'ini' : ''}" title="${esc(c.texto)}">${esc(c.id)}</th>`).join('')).join('')}</tr>
    </thead><tbody>${lista.map(filaEst).join('')}</tbody></table></div>`
    : `<div class="aviso nota">No hay estudiantes en el grupo ${grupoActivo}.</div>`);
  const t = $('#tablaR table');
  if (t) { const w = ['.r-cod', '.r-nom', '.r-mom'].map((c) => t.querySelector('thead ' + c).offsetWidth); t.style.setProperty('--l2', w[0] + 'px'); t.style.setProperty('--l3', w[0] + w[1] + 'px'); t.style.setProperty('--fijo', w[0] + w[1] + w[2] + 'px'); }
  ajustarAltoTabla();
  activarTabs($('#tablaR'), verRespuestas);
  $('#tablaR').querySelectorAll('[data-ficha]').forEach((a) => a.addEventListener('click', () => verEstudiante(a.dataset.ficha)));
}
function ajustarAltoTabla() { const c = $('#tablaR .tabla-r'); if (!c) return; c.style.maxHeight = Math.max(240, innerHeight - c.getBoundingClientRect().top - 16) + 'px'; } // la tabla ocupa todo el alto disponible
window.addEventListener('resize', ajustarAltoTabla);

/* ---------- bitácora ---------- */
$('#btnBitacora').addEventListener('click', async () => {
  try {
    const { bitacora } = await api('bitacora'); const lista = bitacora.slice().reverse().slice(0, 300);
    $('#bitCuerpo').innerHTML = `<h2>Bitácora</h2><p class="guia" style="margin-bottom:12px">Registro de auditoría del servidor: cada registro, edición, aplicación, calificación, acuerdo, eliminación y copia, con fecha y hora de Colombia. ${bitacora.length > 300 ? 'Se muestran los últimos 300 de ' + bitacora.length + '; la copia de seguridad trae todos.' : bitacora.length + ' eventos.'}</p>
      ${lista.length ? `<div class="tabla"><table class="datos bit"><thead><tr><th>Fecha y hora</th><th>Evento</th><th>Detalle</th></tr></thead><tbody>${lista.map((b) => `<tr><td>${esc(b.fecha_hora)}</td><td>${esc(b.evento.replace(/_/g, ' '))}</td><td>${esc(b.detalle)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="aviso nota">Aún no hay eventos.</div>'}`;
    $('#bitacora').classList.remove('oculto');
  } catch (e) { toast('No se pudo leer la bitácora: ' + e.message, true); }
});
$('#bitCerrar').addEventListener('click', () => $('#bitacora').classList.add('oculto'));
$('#bitacora').addEventListener('click', (e) => { if (e.target === $('#bitacora')) $('#bitacora').classList.add('oculto'); });

/* ---------- Excel y copia de seguridad ---------- */
async function conXLSX() { if (!window.XLSX) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'assets/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
$('#btnExcel').addEventListener('click', async () => {
  try { await conXLSX(); await cargar(); descargar(construirExcel(D, { meta: $('#rMeta').checked, calif: $('#rCalif').checked }), `Respuestas_pensamiento_critico_${hoy()}.xlsx`); }
  catch (e) { toast('No se pudo generar el Excel: ' + e.message, true); }
});
$('#btnCopia').addEventListener('click', async () => {
  try { const c = await api('copia'); descargar(JSON.stringify(c, null, 1), `Copia_instrumentos_${c.fecha_hora.replace(/[: ]/g, '-')}.json`, 'application/json'); toast('Copia de seguridad descargada'); }
  catch (e) { toast('No se pudo descargar la copia: ' + e.message, true); }
});
$('#archivoCopia').addEventListener('change', async () => {
  const f = $('#archivoCopia').files[0]; $('#archivoCopia').value = ''; if (!f) return;
  let c; try { c = JSON.parse(await f.text()); if (!Array.isArray(c.participantes)) throw new Error('no es una copia de esta app'); } catch (e) { return toast('Archivo no válido: ' + e.message, true); }
  if (!(await dialogo({ titulo: 'Restaurar copia de seguridad', texto: `La copia del ${c.fecha_hora || '?'} trae ${c.participantes.length} estudiantes, ${(c.pc || []).length} aplicaciones y ${(c.calif || []).length} calificaciones. Se escriben sobre los datos actuales con el mismo código y momento; lo que no esté en la copia se conserva.`, ok: 'Restaurar', peligro: true, escribir: 'RESTAURAR' }))) return;
  try { const r = await api('copia', { method: 'POST', body: { copia: c } }); toast(`Copia restaurada: ${r.n} registros escritos`); await recargar(); } catch (e) { toast('No se pudo restaurar: ' + e.message, true); }
});

/* ---------- arranque ---------- */
(async () => {
  const c = sessionStorage.getItem('clave');
  if (c) { try { await entrar(c); return; } catch (e) {} }
  $('#clave').focus();
})();
