// API de la app de instrumentos. Datos en Netlify Blobs; acceso del aplicador con la clave APP_CLAVE
// (variable de entorno definida en Netlify). Un solo instrumento: la prueba de desempeño de pensamiento crítico (PC),
// aplicada en pantalla en dos momentos (Pretest y Postest) y calificada por dos calificadores más una puntuación acordada.
import { getStore } from "@netlify/blobs";
import INS from "../lib/instrumentos.mjs";

const PC = INS.PC;
const STORES = ["participantes", "pc", "calif"];
const REGS = ["pc", "calif"]; // almacenes con registros por estudiante
const ROLES = ["1", "2", "F"]; // calificador 1, calificador 2, puntuación final acordada
const nomDe = (p) => [p.nombre, p.apellido].filter(Boolean).join(" ").trim();
const store = (name) => getStore({ name, consistency: "strong" });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const z = (n) => String(n).padStart(2, "0");
function ahora() { // hora de Colombia (UTC-5)
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}:${z(d.getUTCSeconds())}`;
}
const hoy = () => ahora().slice(0, 10);

async function firmar(clave, texto) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(texto)));
  return [...sig].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Código de protocolo: identifica la aplicación ante los calificadores sin revelar nombre, grupo ni momento.
// Se deriva de la firma secreta, así que es estable y no se puede deducir del código del estudiante.
async function protocoloDe(secreto, codigo, momento) {
  const h = await firmar(secreto, `protocolo|${codigo}|${momento}`), AL = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = ""; for (let i = 0; i < 4; i++) out += AL[parseInt(h.slice(i * 4, i * 4 + 4), 16) % AL.length];
  return "P-" + out;
}
// Intentos fallidos de clave por dirección IP: espera de 1,5 s tras cada fallo y bloqueo de 15 segundos tras 5 fallos en 10 minutos.
const BLOQUEO_MS = 15000;
const ipDe = (req) => req.headers.get("x-nf-client-connection-ip") || "local";
async function bloqueo(req) {
  const r = await store("intentos").get(ipDe(req), { type: "json" });
  const resta = r ? r.hasta - Date.now() : 0;
  if (resta > 0 && resta <= BLOQUEO_MS) return json({ error: `Demasiados intentos fallidos. Espere ${Math.ceil(resta / 1000)} segundos.` }, 429); // un bloqueo más largo (de una versión anterior) ya no cuenta
  return null;
}
async function fallo(req) {
  const st = store("intentos"), ip = ipDe(req), r = (await st.get(ip, { type: "json" })) || { n: 0, t: 0, hasta: 0 };
  if (Date.now() - r.t > 10 * 60000) r.n = 0; // los intentos se cuentan dentro de 10 minutos
  r.n += 1; r.t = Date.now();
  if (r.n >= 5) { r.hasta = Date.now() + BLOQUEO_MS; r.n = 0; }
  await st.setJSON(ip, r);
  await new Promise((res) => setTimeout(res, 1500));
  return json({ error: r.hasta > Date.now() ? "Demasiados intentos fallidos. Espere 15 segundos." : "Clave incorrecta" }, r.hasta > Date.now() ? 429 : 401);
}
const GRUPOS = ["Piloto", "Experimental", "Control"];
const MOMENTOS = ["Pretest", "Postest"];

async function leerTodo(name) {
  const s = store(name);
  const { blobs } = await s.list();
  // En Windows el almacén local entrega las claves codificadas (E03%7CPretest); se prueba también la clave decodificada.
  const rows = await Promise.all(blobs.map(async (b) => (await s.get(b.key, { type: "json" })) ?? (b.key.includes("%") ? await s.get(decodeURIComponent(b.key), { type: "json" }) : null)));
  return rows.filter(Boolean);
}
async function bitacora(evento, detalle) {
  await store("bitacora").setJSON(`${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, { fecha_hora: ahora(), evento, detalle });
}

/* ---------- lógica del instrumento (la misma que en public/assets/comun.js) ---------- */
const ITEMS = PC.items, ITEM = Object.fromEntries(ITEMS.map((i) => [i.codigo, i]));
const PUNTUABLES = ITEMS.filter((i) => !i.auxiliar);
const esCerrado = (it) => it.puntuacion.tipo.startsWith("clave");
const RUBRICA = PUNTUABLES.filter((i) => i.puntuacion.tipo === "rubrica");
const vacio = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.values(v).some((x) => x));
// Limpia las respuestas: solo claves conocidas y valores válidos para cada tipo de parte.
function normalizarRespuestas(r) {
  const out = {}; r = r && typeof r === "object" ? r : {};
  for (const it of ITEMS) for (const p of it.partes) {
    const k = it.codigo + p.id, v = r[k];
    if (p.tipo === "opcion") { if (p.opciones.some((o) => o.v === v)) out[k] = v; }
    else if (p.tipo === "multiple") { if (Array.isArray(v)) { const m = p.opciones.map((o) => o.v).filter((x) => v.includes(x)); if (m.length) out[k] = m; } }
    else if (p.tipo === "union") { if (v && typeof v === "object") { const u = {}; for (const f of p.filas) if (p.opciones.some((o) => o.v === v[f.id])) u[f.id] = v[f.id]; if (Object.keys(u).length) out[k] = u; } }
    else if (p.tipo === "texto") { if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 1200); }
  }
  return out;
}
const respondido = (it, resp) => it.partes.some((p) => !vacio(resp[it.codigo + p.id]));
// Estado de cada ítem: "omitido" (tuvo oportunidad y no respondió: 0 puntos) o "faltante" (sin oportunidad: dato faltante).
// Un ítem sin respuesta y sin estado queda como omitido. El ítem 8 sin la elección del 5 queda faltante (regla de la guía).
function normalizarEstado(e, resp, pendientes = []) {
  const out = {}; e = e && typeof e === "object" ? e : {};
  for (const it of ITEMS) {
    if (e[it.codigo] === "faltante" || pendientes.includes(it.codigo)) out[it.codigo] = "faltante"; // los pendientes de una aplicación incompleta no se alcanzaron: dato faltante
    else if (e[it.codigo] === "omitido" || !respondido(it, resp)) out[it.codigo] = "omitido";
  }
  for (const it of PUNTUABLES) if (it.puntuacion.tipo === "clave_condicional") {
    const d = it.puntuacion.depende; if (vacio(resp[d.item + d.parte]) || out[d.item]) out[it.codigo] = "faltante";
  }
  return out;
}
function normalizarEscriba(e) {
  const out = {}; e = e && typeof e === "object" ? e : {};
  for (const it of ITEMS) for (const p of it.partes) if (p.tipo === "texto" && e[it.codigo + p.id] === "aplicador") out[it.codigo + p.id] = "aplicador";
  return out;
}
// Puntaje automático de los ítems cerrados (0 o 2 por la clave; el 8 según la elección del 5).
function autoPuntajes(resp, estado) {
  const auto = {};
  for (const it of PUNTUABLES) {
    if (!esCerrado(it) || estado[it.codigo] === "faltante") continue;
    if (estado[it.codigo] === "omitido") { auto[it.codigo] = 0; continue; }
    const pu = it.puntuacion, v = resp[it.codigo + pu.parte];
    const clave = pu.tipo === "clave" ? pu.clave : pu.claves[resp[pu.depende.item + pu.depende.parte]];
    auto[it.codigo] = v != null && v === clave ? 2 : 0;
  }
  return auto;
}
// Orden en que se presentaron las situaciones (el postest las baraja por bloques): se guarda solo si es una permutación válida
// de las situaciones que respeta los bloques (las cuatro primeras entre sí y las dos de revisión entre sí).
const SITS = PC.situaciones.map((s) => s.id);
function ordenValido(o) {
  if (!Array.isArray(o) || o.length !== SITS.length || new Set(o).size !== SITS.length || !o.every((x) => SITS.includes(x))) return false;
  let i = 0; for (const b of PC.bloques) { const tramo = o.slice(i, i + b.situaciones.length); if (tramo.some((x) => !b.situaciones.includes(x))) return false; i += b.situaciones.length; }
  return true;
}
const llave = (codigo, m) => `${codigo}-${m}`;
const llaveC = (codigo, m, rol) => `${codigo}-${m}-${rol}`;
const llaves = (s, codigo) => (s === "pc" ? MOMENTOS.map((m) => llave(codigo, m)) : MOMENTOS.flatMap((m) => ROLES.map((rol) => llaveC(codigo, m, rol))));
const llaveDe = (s, r) => (s === "pc" ? llave(r.codigo, r.momento) : llaveC(r.codigo, r.momento, r.rol));

export default async (req) => {
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const clave = Netlify.env.get("APP_CLAVE");
  if (!clave) return json({ error: "Falta definir la variable APP_CLAVE en Netlify" }, 500);
  const secreto = Netlify.env.get("FIRMA_SECRETA") || clave; // deriva los códigos de protocolo; separada de la clave para poder cambiarla sin alterarlos
  const body = req.method === "GET" || req.method === "DELETE" ? {} : await req.json().catch(() => ({}));

  const bloq = await bloqueo(req); if (bloq) return bloq;
  if (ruta === "entrar") { if (body.clave === clave) { await store("intentos").delete(ipDe(req)); return json({ ok: true }); } return fallo(req); }
  if (req.headers.get("x-clave") !== clave) return fallo(req);

  if (ruta === "datos" && req.method === "GET") { // la bitácora no viaja aquí: solo con /api/bitacora o en la copia de seguridad
    const [participantes, pc, calif] = await Promise.all(STORES.map(leerTodo));
    participantes.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return json({ v: 3, participantes, pc, calif });
  }
  if (ruta === "bitacora" && req.method === "GET") {
    const bit = await leerTodo("bitacora"); bit.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    return json({ bitacora: bit });
  }
  if (ruta === "bitacora" && req.method === "DELETE") { // vaciar la bitácora por completo (p. ej. antes del trabajo de campo real): queda en cero
    const st = store("bitacora"), { blobs } = await st.list();
    for (const b of blobs) await st.delete(b.key);
    return json({ ok: true, borrados: blobs.length });
  }
  if (ruta === "copia" && req.method === "GET") { // copia de seguridad completa
    const [participantes, pc, calif, papelera, bit] = await Promise.all([...STORES, "papelera", "bitacora"].map(leerTodo));
    bit.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    await bitacora("copia", "Descarga de copia de seguridad");
    return json({ version: 2, fecha_hora: ahora(), participantes, pc, calif, papelera, bitacora: bit });
  }
  if (ruta === "copia" && req.method === "POST") { // restaurar: escribe lo que trae la copia sin borrar lo demás
    const c = body.copia || {};
    if (!Array.isArray(c.participantes)) return json({ error: "El archivo no es una copia de seguridad válida" }, 400);
    let n = 0;
    for (const p of c.participantes) if (p && /^[A-Z0-9]{1,8}$/.test(String(p.codigo || ""))) { await store("participantes").setJSON(p.codigo, p); n++; }
    for (const r of c.pc || []) if (r && r.codigo && MOMENTOS.includes(r.momento)) { await store("pc").setJSON(llave(r.codigo, r.momento), r); n++; }
    for (const r of c.calif || []) if (r && r.codigo && MOMENTOS.includes(r.momento) && ROLES.includes(r.rol)) { await store("calif").setJSON(llaveC(r.codigo, r.momento, r.rol), r); n++; }
    for (const x of c.papelera || []) if (x && x.participante && x.participante.codigo) { await store("papelera").setJSON(x.participante.codigo, x); n++; }
    await bitacora("restauracion_copia", `${n} registros escritos desde una copia de seguridad del ${c.fecha_hora || "?"}`);
    return json({ ok: true, n });
  }
  if (ruta === "participante" && req.method === "PUT") {
    const r = body.row || {};
    const codigo = String(r.codigo || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(codigo)) return json({ error: "Código inválido (letras y números, máximo 8)" }, 400);
    if (!GRUPOS.includes(r.grupo)) return json({ error: "Seleccione el grupo" }, 400);
    if (!["Femenino", "Masculino"].includes(r.sexo)) return json({ error: "Seleccione el sexo" }, 400);
    const row = { codigo, nombre: String(r.nombre || "").trim().slice(0, 60), apellido: String(r.apellido || "").trim().slice(0, 60), grupo: r.grupo, sexo: r.sexo, edad: Number(r.edad) || "", fecha_registro: r.fecha_registro || hoy(), observaciones: String(r.observaciones || "").slice(0, 300) };
    const existia = await store("participantes").get(codigo, { type: "json" });
    const anterior = String(body.anterior || "").trim().toUpperCase(); // cambio de código desde la ficha
    if (body.nuevo || (anterior && anterior !== codigo)) { // el código identifica al estudiante en todas las pruebas: no puede repetirse ni reutilizarse
      if (existia) return json({ error: `El código ${codigo} ya lo tiene ${nomDe(existia)}. Para dárselo a ${body.nuevo ? "un estudiante nuevo" : "este estudiante"}, cambie primero el código de ${nomDe(existia)}.` }, 409);
      if (await store("papelera").get(codigo, { type: "json" })) return json({ error: `El código ${codigo} es de un estudiante que está en la papelera; recupérelo o elimínelo definitivamente antes de usar ese código.` }, 409);
    }
    if (anterior && anterior !== codigo) { // el estudiante y todos sus registros pasan al nuevo código
      if (!(await store("participantes").get(anterior, { type: "json" }))) return json({ error: "Estudiante no registrado" }, 404);
      let n = 0;
      for (const s of REGS) for (const k of llaves(s, anterior)) {
        const r0 = await store(s).get(k, { type: "json" });
        if (r0) { const r1 = { ...r0, codigo }; if (s === "pc") r1.protocolo = await protocoloDe(secreto, codigo, r0.momento); await store(s).setJSON(llaveDe(s, r1), r1); await store(s).delete(k); n++; }
      }
      await store("participantes").setJSON(codigo, row);
      await store("participantes").delete(anterior);
      await bitacora("edicion", `Participante ${anterior} pasa a ser ${codigo} (${row.nombre} ${row.apellido}) con ${n} registro(s)`);
      return json({ ok: true, row, movidos: n });
    }
    await store("participantes").setJSON(codigo, row);
    await bitacora(existia ? "edicion" : "registro", `Participante ${codigo} ${row.nombre} ${row.apellido} (${row.grupo})`);
    return json({ ok: true, row });
  }
  if (ruta === "participante" && req.method === "DELETE") { // a la papelera, con todos sus registros
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase();
    const p = await store("participantes").get(codigo, { type: "json" });
    if (!p) return json({ error: "Estudiante no encontrado" }, 404);
    const registros = {};
    for (const s of REGS) { registros[s] = []; for (const k of llaves(s, codigo)) { const r = await store(s).get(k, { type: "json" }); if (r) registros[s].push(r); } }
    await store("papelera").setJSON(codigo, { participante: p, registros, fecha: ahora() });
    for (const s of REGS) for (const k of llaves(s, codigo)) await store(s).delete(k);
    await store("participantes").delete(codigo);
    const n = registros.pc.length;
    await bitacora("papelera", `Participante ${codigo} ${p.nombre} ${p.apellido || ""} movido a la papelera con ${n} aplicación(es) y ${registros.calif.length} calificación(es)`);
    return json({ ok: true, registros: n });
  }
  if (ruta === "papelera" && req.method === "GET") {
    const lista = await leerTodo("papelera");
    return json({ papelera: lista.map((x) => ({ ...x.participante, fecha_papelera: x.fecha, registros: (x.registros.pc || []).length })).sort((a, b) => a.codigo.localeCompare(b.codigo)) });
  }
  if (ruta === "restaurar" && req.method === "POST") {
    const codigo = String(body.codigo || "").toUpperCase();
    const x = await store("papelera").get(codigo, { type: "json" });
    if (!x) return json({ error: "No está en la papelera" }, 404);
    if (await store("participantes").get(codigo, { type: "json" })) return json({ error: `Ya existe un estudiante activo con el código ${codigo}` }, 400);
    await store("participantes").setJSON(codigo, x.participante);
    for (const s of REGS) for (const r of x.registros[s] || []) await store(s).setJSON(llaveDe(s, r), r);
    await store("papelera").delete(codigo);
    await bitacora("restauracion", `Participante ${codigo} restaurado desde la papelera`);
    return json({ ok: true });
  }
  if (ruta === "papelera" && req.method === "DELETE") {
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase();
    await store("papelera").delete(codigo);
    await bitacora("eliminacion", `Participante ${codigo} eliminado definitivamente desde la papelera`);
    return json({ ok: true });
  }
  if (ruta === "registro" && req.method === "PUT") { // una aplicación de la prueba (pretest o postest)
    const r = body.row || {}, codigo = String(r.codigo || "").toUpperCase(), momento = r.momento;
    if (!MOMENTOS.includes(momento)) return json({ error: "Momento inválido" }, 400);
    if (!(await store("participantes").get(codigo, { type: "json" }))) return json({ error: "Estudiante no registrado" }, 404);
    // Aplicación incompleta (el aplicador salió o se cerró el navegador): se guarda lo respondido; los ítems no alcanzados ("pendientes")
    // quedan como dato faltante, y la aplicación se puede continuar después desde donde quedó (interrumpida_en).
    const incompleta = r.incompleta === true, codigos = ITEMS.map((it) => it.codigo);
    const pendientes = incompleta && Array.isArray(r.pendientes) ? r.pendientes.filter((c) => codigos.includes(c)) : [];
    const respuestas = normalizarRespuestas(r.respuestas), estado = normalizarEstado(r.estado, respuestas, pendientes), escriba = normalizarEscriba(r.escriba);
    const nResp = ITEMS.filter((it) => respondido(it, respuestas)).length;
    if (!nResp && !Object.values(estado).includes("faltante")) return json({ error: "La aplicación no tiene ninguna respuesta" }, 400);
    const row = { codigo, momento, fecha: r.fecha_inicio || hoy(), fecha_hora: ahora(), aplicador: String(r.aplicador || "").slice(0, 80), duracion_seg: Number(r.duracion_seg) || 0, protocolo: await protocoloDe(secreto, codigo, momento),
      version: PC.version || 1, // versión del instrumento con la que se aplicó (los textos, claves y puntajes automáticos quedan ligados a ella)
      respuestas, estado, escriba, auto: autoPuntajes(respuestas, estado), ...(ordenValido(r.orden) ? { orden: r.orden } : {}),
      ...(incompleta ? { incompleta: true, pendientes, interrumpida_en: codigos.includes(r.interrumpida_en) ? r.interrumpida_en : pendientes[0] || "" } : {}), observaciones: String(r.observaciones || "").slice(0, 800) };
    const k = llave(codigo, momento);
    const previo = await store("pc").get(k, { type: "json" });
    await store("pc").setJSON(k, row);
    let borradas = 0;
    if (previo) for (const rol of ROLES) { if (await store("calif").get(llaveC(codigo, momento, rol), { type: "json" })) { await store("calif").delete(llaveC(codigo, momento, rol)); borradas++; } } // una nueva aplicación invalida las calificaciones de la anterior
    const continua = previo && previo.incompleta; // guardado parcial sucesivo o continuación: un solo evento al terminar
    if (!continua || !incompleta) await bitacora(previo && !continua ? "sobrescritura" : "aplicacion", `${PC.nombre} ${codigo} ${momento} (${row.protocolo})${incompleta ? ` incompleta, quedó en ${row.interrumpida_en}` : continua ? " completada" : ""}${borradas ? `; se descartaron ${borradas} calificación(es) de la aplicación anterior` : ""}`);
    return json({ ok: true, row, calificaciones_borradas: borradas });
  }
  if (ruta === "registro" && req.method === "DELETE") {
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase(), momento = url.searchParams.get("momento");
    if (!MOMENTOS.includes(momento)) return json({ error: "Parámetros inválidos" }, 400);
    await store("pc").delete(llave(codigo, momento));
    for (const rol of ROLES) await store("calif").delete(llaveC(codigo, momento, rol));
    await bitacora("eliminacion", `${PC.nombre} ${codigo} ${momento} (con sus calificaciones)`);
    return json({ ok: true });
  }
  if (ruta === "calificacion" && req.method === "PUT") { // puntuación de un calificador (rol 1 o 2) o la acordada (rol F) sobre los ítems de rúbrica
    const codigo = String(body.codigo || "").toUpperCase(), momento = body.momento, rol = String(body.rol || "");
    if (!MOMENTOS.includes(momento) || !ROLES.includes(rol)) return json({ error: "Parámetros inválidos" }, 400);
    const reg = await store("pc").get(llave(codigo, momento), { type: "json" });
    if (!reg) return json({ error: "No existe esa aplicación" }, 404);
    const pts = body.puntos && typeof body.puntos === "object" ? body.puntos : {}, puntos = {};
    for (const it of RUBRICA) {
      const e = reg.estado?.[it.codigo];
      if (e === "faltante") continue; // dato faltante: no se puntúa
      if (e === "omitido") { puntos[it.codigo] = 0; continue; } // omisión con oportunidad: 0 por regla
      const v = Number(pts[it.codigo]); if ([0, 1, 2].includes(v)) puntos[it.codigo] = v;
    }
    const pendientes = RUBRICA.filter((it) => reg.estado?.[it.codigo] !== "faltante" && puntos[it.codigo] == null).length;
    const row = { codigo, momento, rol, calificador: String(body.calificador || "").trim().slice(0, 80), fecha: hoy(), fecha_hora: ahora(), puntos, completa: pendientes === 0, observaciones: String(body.observaciones || "").slice(0, 800) };
    if (rol === "F") { const [c1, c2] = await Promise.all(["1", "2"].map((x) => store("calif").get(llaveC(codigo, momento, x), { type: "json" }))); row.calificadores = [c1?.calificador, c2?.calificador].filter(Boolean); }
    const k = llaveC(codigo, momento, rol), previo = await store("calif").get(k, { type: "json" });
    await store("calif").setJSON(k, row);
    await bitacora(rol === "F" ? "acuerdo" : "calificacion", `${reg.protocolo || codigo + " " + momento} · ${rol === "F" ? "puntuación acordada" : "calificador " + rol} ${row.calificador ? "(" + row.calificador + ")" : ""} ${row.completa ? "completa" : `con ${pendientes} ítem(s) pendiente(s)`}${previo ? ", reemplaza la anterior" : ""}`);
    return json({ ok: true, row });
  }
  if (ruta === "calificacion" && req.method === "DELETE") {
    const codigo = String(url.searchParams.get("codigo") || "").toUpperCase(), momento = url.searchParams.get("momento"), rol = String(url.searchParams.get("rol") || "");
    if (!MOMENTOS.includes(momento) || !ROLES.includes(rol)) return json({ error: "Parámetros inválidos" }, 400);
    await store("calif").delete(llaveC(codigo, momento, rol));
    await bitacora("eliminacion", `Calificación ${rol === "F" ? "acordada" : "del calificador " + rol} de ${codigo} ${momento}`);
    return json({ ok: true });
  }
  return json({ error: "Ruta no encontrada" }, 404);
};

export const config = { path: "/api/*" };
